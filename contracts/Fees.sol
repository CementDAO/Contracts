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
 */
contract Fees is Governance {
    using SafeMath for uint256;

    /**
     * @dev Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function REDEMPTION() public pure returns(int8) {
        return -1;
    }

    /**
     * @dev Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function TRANSFER() public pure returns(int8) {
        return 0;
    }

    /**
     * @dev Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function DEPOSIT() public pure returns(int8) {
        return 1;
    }


    /**
     * @dev (C13) As a Stablecoin Holder, I would like to be
     * able to pay any fees with any of the stablecoins on the basket list
     */
    function setPayFeesWith(address _token) public {
        payFeesWith[msg.sender] = _token;
    }

    /**
     * @dev (C5, C6, C7) As a Governance Function, I would like a API, which may only
     * be accessed by the whitelisted addresses, and which allows me
     * to set the base fee for deposit, redemption and transfer transactions. The fee is set in fixed
     * point units in which fixed_1() is equal to 1.
     * Test setTransactionFee(minimumFee) works and token.transactionFee returns minimumFee
     * Test setTransactionFee(minimumFee-1) throws
     */
    function setTransactionFee(address _token, int256 _fee, int8 _transactionType)
        public
        onlyGovernor()
    {
        require(_fee >= minimumFee, "Fees can't be set to less than the minimum fee.");
        TokenData memory token = tokens[_token];
        if (_transactionType == DEPOSIT()) token.depositFee = _fee;
        else if (_transactionType == TRANSFER()) token.transferFee = _fee;
        else if (_transactionType == REDEMPTION()) token.redemptionFee = _fee;
        else revert("Transaction type not accepted.");
        
        tokens[_token] = token;
    }

    /**
     * @dev (C20) Returns what would be the proportion of a token in the basket
     * after depositing or redeeming a number of tokens. If adding, this 
     * function will throw if the amount of tokens deposited, the current token
     * balance or the basket balance are greater than FixidityLib.max_fixed_add().
     * This function returns values in the [0,fixed_1()] range.
     * Testing: With an empty basket.
     * Test proportionAfterTransaction(token,1,DEPOSIT) returns fixed_1
     * Introduce 1 token of x into the basket.
     * Test proportionAfterTransaction(x,1,DEPOSIT) returns fixed_1
     * Test proportionAfterTransaction(y,1,DEPOSIT) returns fixed_1/2
     * Testing: With a basket containing 2 wei each of x and y.
     * Test proportionAfterTransaction(x,1,REDEMPTION) returns fixed_1/2
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
            Utils.safeCast(convertTokens(_token, address(this))), 
            // We specify that this already uses a fixed point representation of decimals 
            // to convert to the library representation and be able to use the add function
            ERC20Detailed(address(this)).decimals()
        );     

        int256 transactionAmount = FixidityLib.newFixed(
            Utils.safeCast(convertTokensAmount(_token, address(this), _transactionAmount)), 
            ERC20Detailed(address(this)).decimals()
        );
        // Add the token balance to the amount to deposit, in fixidity units
        int256 tokenBalanceAfterTransaction;
        if (_transactionType == DEPOSIT()) {
            require(tokenBalance < FixidityLib.max_fixed_add(), "Token balance to high to accept deposits.");
            require(transactionAmount < FixidityLib.max_fixed_add(), "Deposit too large, risk of overflow.");
            tokenBalanceAfterTransaction = FixidityLib.add(
                tokenBalance, 
                transactionAmount
            );
        }
        else if (_transactionType == REDEMPTION()) {
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
            require(basketBeforeTransaction < FixidityLib.max_fixed_add(), "Basket balance too high to accept deposits.");
            require(transactionAmount < FixidityLib.max_fixed_add(), "Deposit too large, risk of overflow.");
            basketAfterTransaction = FixidityLib.add(
                basketBeforeTransaction, 
                transactionAmount
            );
        }
        else if (_transactionType == REDEMPTION()) {
            assert(transactionAmount <= basketBeforeTransaction);
            basketAfterTransaction = FixidityLib.subtract(
                basketBeforeTransaction, 
                transactionAmount
            );
        } else revert("Transaction type not accepted.");

        int256 result = FixidityLib.divide(
            tokenBalanceAfterTransaction,
            basketAfterTransaction
        );
        
        //assert(result >= 0 && result <= FixidityLib.fixed_1());
        return result;
    }

    /**
     * @dev (C20) Returns what would be the deviation from the target 
     * proportion of a token in the basket after adding a number of tokens.
     * This function returns values in the [-fixed_1(),fixed_1()] range.
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
        uint256 _amount,
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        TokenData memory token = tokens[_token];
        int256 result = FixidityLib.subtract(
            proportionAfterTransaction(_token, _amount, _transactionType),
            token.targetProportion
        );
        assert(
            result >= FixidityLib.fixed_1()*(-1) && 
            result <= FixidityLib.fixed_1()
        );
        return result;
    }

    /**
     * @dev (C20) Calculates the deposit fee as decribed in the CementDAO.
     * whitepaper. Uses fixed point units from FixidityLib.
     * The transaction amount passed on as a parameter is always in _token wei.
     */
    function transactionFee(address _token, uint256 _amount, int8 _transactionType)
        public
        view
        returns (uint256) 
    {
        // Basket position after deposit, make sure these are fixed point units
        TokenData memory token = tokens[_token];
        int256 deviation = deviationAfterTransaction(_token, _amount, _transactionType);
        int256 fee = minimumFee;

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
        int256 scaledLogit = FixidityLib.multiply(
                FixidityLib.multiply(
                    token.depositFee,
                    scalingFactor
                ),
                deviationLogit
            );
        if (_transactionType == DEPOSIT()) {
            fee = FixidityLib.add(
                token.depositFee,
                scaledLogit
            );
        } else if (_transactionType == REDEMPTION()) {
            fee = FixidityLib.subtract(
                token.depositFee,
                scaledLogit
            );
        } else revert("Transaction type not accepted.");

        if (fee < minimumFee) fee = minimumFee;
        assert (fee >= 0);
        return uint256(
            FixidityLib.fromFixed(
                fee,
                ERC20Detailed(address(this)).decimals()
            )
        );
    }
}
