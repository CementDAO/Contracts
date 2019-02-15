pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./fixidity/FixidityLib.sol";
import "./fixidity/LogarithmLib.sol";
import "./Governance.sol";
import "./Utils.sol";

/**
 * @title Fees contract.
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Calculates the fees for deposits and redemptions according to the 
 * CementDAO whitepaper formulas, using FixidityLib for arithmetic and MIXR.sol
 * to retrieve token basket parameters.
 */
contract Fees is Governance {
    using SafeMath for uint256;

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function REDEMPTION() public pure returns(int8) {
        return -1;
    }

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function TRANSFER() public pure returns(int8) {
        return 0;
    }

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function DEPOSIT() public pure returns(int8) {
        return 1;
    }

    /**
     * @notice (C13) As a Stablecoin Holder, I would like to be
     * able to pay any fees with any of the stablecoins on the basket list
     */
    /* function setPayFeesWith(address _token) public {
        payFeesWith[msg.sender] = _token;
    }* 

    /**
     * @notice (C5, C6, C7) As a Governance Function, I would like a API, which may only
     * be accessed by the whitelisted addresses, and which allows me
     * to set the base fee for deposit, redemption and transfer transactions.
     * *param uint256 _fee Amount to set in MIX wei.
     * @dev
     * Test setTransactionFee(minimumFee) works and token.transactionFee returns minimumFee
     * Test setTransactionFee(minimumFee-1) throws
     */
    function setTransactionFee(address _token, uint256 _fee, int8 _transactionType)
        public
        onlyGovernor()
    {
        require(_fee >= minimumFee, "Fees can't be set to less than the minimum fee.");
        TokenData memory token = tokens[_token];
        if (_transactionType == DEPOSIT()) token.depositFee = _fee;
        // else if (_transactionType == TRANSFER()) token.transferFee = _fee;
        else if (_transactionType == REDEMPTION()) token.redemptionFee = _fee;
        else revert("Transaction type not accepted.");
        
        tokens[_token] = token;
    }

    /**
     * @notice (C20) Returns what would be the proportion of a token in the basket
     * after depositing or redeeming a number of tokens. If adding, this 
     * function will throw if the amount of tokens deposited, the current token
     * balance or the basket balance are greater than FixidityLib.maxFixedAdd().
     * *param uint256 _transactionAmount Amount to deposit or redeem in _token wei.
     * @return int256 A fixed point value representing the proportion in the 
     * [0,fixed1()] range.
     * @dev 
     * Testing: With an empty basket.
     * Test proportionAfterTransaction(token,1,DEPOSIT) returns fixed1
     * Introduce 1 token of x into the basket.
     * Test proportionAfterTransaction(x,1,DEPOSIT) returns fixed1
     * Test proportionAfterTransaction(y,1,DEPOSIT) returns fixed1/2
     * Testing: With a basket containing 2 wei each of x and y.
     * Test proportionAfterTransaction(x,1,REDEMPTION) returns fixed1/2
     * Test proportionAfterTransaction(x,2,REDEMPTION) returns 0
     */
    function proportionAfterTransaction(
        address _token, 
        uint256 _transactionAmount, 
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        int256 tokenBalance = FixidityLib.newFixed(
            // The command below returns the balance of _token with this.decimals precision
            Utils.safeCast(
                Utils.convertTokenAmount(
                    _token, 
                    address(this),
                    IERC20(_token).balanceOf(address(this)))
                ), 
            // We specify that this already uses a fixed point representation of decimals 
            // to convert to the library representation and be able to use the add function
            ERC20Detailed(address(this)).decimals()
        );     

        int256 transactionAmount = FixidityLib.newFixed(
            Utils.safeCast(
                Utils.convertTokenAmount(
                    _token, 
                    address(this), 
                    _transactionAmount)
                ), 
            ERC20Detailed(address(this)).decimals()
        );
        // Add the token balance to the amount to deposit, in fixidity units
        int256 tokenBalanceAfterTransaction;
        if (_transactionType == DEPOSIT()) {
            require(tokenBalance < FixidityLib.maxFixedAdd(), "Token balance to high to accept deposits.");
            require(transactionAmount < FixidityLib.maxFixedAdd(), "Deposit too large, risk of overflow.");
            tokenBalanceAfterTransaction = FixidityLib.add(
                tokenBalance, 
                transactionAmount
            );
        } else if (_transactionType == REDEMPTION()) {
            assert(transactionAmount <= tokenBalance);
            tokenBalanceAfterTransaction = FixidityLib.subtract(
                tokenBalance, 
                transactionAmount
            );
        } else revert("Transaction type not accepted.");

        // The amount to redeem needs to be added to the basket balance to avoid
        // dividing by zero on an empty basket.
        
        int256 basketBeforeTransaction = FixidityLib.newFixed(
                Utils.safeCast(basketBalance()),
                ERC20Detailed(address(this)).decimals()
        );
        int256 basketAfterTransaction;
        if (_transactionType == DEPOSIT()) {
            require(basketBeforeTransaction < FixidityLib.maxFixedAdd(), "Basket balance too high to accept deposits.");
            require(transactionAmount < FixidityLib.maxFixedAdd(), "Deposit too large, risk of overflow.");
            basketAfterTransaction = FixidityLib.add(
                basketBeforeTransaction, 
                transactionAmount
            );
        } else if (_transactionType == REDEMPTION()) {
            assert(transactionAmount <= basketBeforeTransaction);
            basketAfterTransaction = FixidityLib.subtract(
                basketBeforeTransaction, 
                transactionAmount
            );
        } // else statement does not happen here. It would have reverted above.

        int256 result = FixidityLib.divide(
            tokenBalanceAfterTransaction,
            basketAfterTransaction
        );
        
        //assert(result >= 0 && result <= FixidityLib.fixed1());
        return result;
    }

    /**
     * @notice (C20) Returns what would be the deviation from the target 
     * proportion of a token in the basket after a deposit or a redemption.
     * *param uint256 _transactionAmount Amount to deposit or redeem in _token wei.
     * @return int256 A fixed point value representing the proportion in the 
     * [-fixed1(),fixed1()] range.
     * @dev
     * With an empty basket:
     * Set targetProportion of token x to 1
     * Test deviationAfterTransaction(x,1,DEPOSIT) returns 1
     * Introduce 1 token of type y (not x) to the basket.
     * Test deviationAfterTransaction(x,1,DEPOSIT) returns -0.5
     * Set targetProportion of token x to 0
     * Test deviationAfterTransaction(x,1,DEPOSIT) returns 0.5
     */
    function deviationAfterTransaction(
        address _token, 
        uint256 _transactionAmount,
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        TokenData memory token = tokens[_token];
        int256 result = FixidityLib.subtract(
            proportionAfterTransaction(_token, _transactionAmount, _transactionType),
            token.targetProportion
        );
        assert(
            result >= FixidityLib.fixed1()*(-1) && 
            result <= FixidityLib.fixed1()
        );
        return result;
    }

    /**
     * @notice (C20) Calculates the deposit or redemption fee as decribed in the CementDAO.
     * whitepaper.
     * *param uint256 _transactionAmount Amount to deposit or redeem in _token wei.
     * @return uint256 The calculated fee in MIX wei.
     */
    function transactionFee(address _token, uint256 _transactionAmount, int8 _transactionType)
        public
        view
        returns (uint256) 
    {
        TokenData memory token = tokens[_token];
        int256 deviation = deviationAfterTransaction(_token, _transactionAmount, _transactionType);
        int256 fee;

        // Floors and ceilings
        if (_transactionType == DEPOSIT()) {
            // When the deviation goes above this value the deposit is rejected
            int256 upperBound = FixidityLib.multiply(
                FixidityLib.newFixedFraction(4,10),
                token.targetProportion
            );
            if (deviation > upperBound)
                revert("Token not accepted, basket has too many.");
            
            // Deposits have a floor on -0.4 * targetProportion for deviation 
            int256 lowerBound = FixidityLib.multiply(
                FixidityLib.newFixedFraction(-4,10),
                token.targetProportion
            );
            if (deviation <= lowerBound)
                deviation = lowerBound;
        } else if (_transactionType == REDEMPTION()) {
            // Redemptions have a ceiling on 0.4 * targetProportion for deviation
            int256 upperBound = FixidityLib.multiply(
                FixidityLib.newFixedFraction(4,10),
                token.targetProportion
            );
            if (deviation > upperBound)
                deviation = upperBound;

            // Redemptions have a floor on -0.4999 * targetProportion for deviation
            int256 lowerBound = FixidityLib.multiply(
                FixidityLib.newFixedFraction(-4999,10000),
                token.targetProportion
            );
            if (deviation < lowerBound)
                deviation = lowerBound;
            // Redemptions when no tokens are in the basket are managed by the redeemMIXR function
        } else revert("Transaction type not accepted.");
        
        // Calculate the fee following the formula from the inside out
        int256 t2 = FixidityLib.divide(
            token.targetProportion,
            FixidityLib.newFixed(2)
        );
        int256 deviationCurve = FixidityLib.divide(
            FixidityLib.add(
                deviation,
                t2
            ),
            FixidityLib.subtract(
                t2,
                deviation
            )
        );
        int256 deviationLogit = LogarithmLib.log_b(
            FixidityLib.newFixed(10),
            deviationCurve
        );

        if (_transactionType == DEPOSIT()) {
            int256 baseFee = FixidityLib.newFixed(
                Utils.safeCast(token.depositFee), 
                ERC20Detailed(address(this)).decimals()
            );
            int256 scaledLogit = FixidityLib.multiply(
                FixidityLib.multiply(
                    baseFee,
                    scalingFactor
                ),
                deviationLogit
            );
            fee = FixidityLib.add(
                baseFee,
                scaledLogit
            );
        } else if (_transactionType == REDEMPTION()) {
            int256 baseFee = FixidityLib.newFixed(
                Utils.safeCast(token.redemptionFee), 
                ERC20Detailed(address(this)).decimals()
            );
            int256 scaledLogit = FixidityLib.multiply(
                FixidityLib.multiply(
                    baseFee,
                    scalingFactor
                ),
                deviationLogit
            );
            fee = FixidityLib.subtract(
                    baseFee,
                    scaledLogit
            );
        } // else statement does not happen here. It would have reverted above.

        assert(fee >= 0);
        if (fee < Utils.safeCast(minimumFee)) 
            fee = Utils.safeCast(minimumFee);

        return uint256(
            FixidityLib.fromFixed(
                fee,
                ERC20Detailed(address(this)).decimals()
            )
        );
    }
}
