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
        isAcceptedToken(_token)
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
        uint256 _deposit, 
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        //assert(amount < FixidityLib.max_fixed_add());
        //assert(tokenBalance < FixidityLib.max_fixed_add());
        int256 tokenBalance = FixidityLib.newFixed(
            // The command below returns the balance of _token with this.decimals precision
            convertTokens(_token, address(this)), 
            // We specify that this already uses a fixed point representation of decimals 
            // to convert to the library representation and be able to use the add function
            ERC20Detailed(address(this)).decimals()
        );
        int256 deposit = FixidityLib.newFixed(
            convertTokensAmount(_token, address(this), _deposit), 
            ERC20Detailed(address(this)).decimals()
        );
        // Add the token balance to the amount to deposit, in fixidity units
        int256 tokenBalanceAfterTransaction;
        if (_transactionType == DEPOSIT()) {
            assert(tokenBalance < FixidityLib.max_fixed_add());
            assert(deposit < FixidityLib.max_fixed_add());
            tokenBalanceAfterTransaction = FixidityLib.add(
                tokenBalance, 
                deposit
            );
        }
        else if (_transactionType == REDEMPTION()) {
            assert(deposit <= tokenBalance);
            tokenBalanceAfterTransaction = FixidityLib.subtract(
                tokenBalance, 
                deposit
            );
        } else revert("Transaction type not accepted.");

        // The amount to deposit needs to be added to the basket balance to avoid
        // dividing by zero on an empty basket.
        
        int256 basketBeforeTransaction = FixidityLib.newFixed(
                Utils.safeCast(basketBalance()),
                ERC20Detailed(address(this)).decimals()
        );
        
        int256 basketAfterTransaction;
        if (_transactionType == DEPOSIT()) {
            assert(basketBeforeTransaction < FixidityLib.max_fixed_add());
            assert(deposit < FixidityLib.max_fixed_add());
            basketAfterTransaction = FixidityLib.add(
                basketBeforeTransaction, 
                deposit
            );
        }
        else if (_transactionType == REDEMPTION()) {
            assert(deposit <= basketBeforeTransaction);
            basketAfterTransaction = FixidityLib.subtract(
                basketBeforeTransaction, 
                deposit
            );
        } else revert("Transaction type not accepted.");

        int256 result = FixidityLib.divide(
            tokenBalanceAfterTransaction,
            basketAfterTransaction
        );
        assert(result >= 0 && result <= FixidityLib.fixed_1());
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
     * Set proportion x = fixed_1()/2
     * Set proportion y = fixed_1()/2
     * Set scalingFactor = fixed_1()/2
     * Set token.transactionFee(x) = fixed_1()/10
     * Set token.transactionFee(y) = fixed_1()/10
     * Set basket to contain 0 tokens of x and 90 tokens of y. Call transactionFee(x,10). 
     * Results: Proportion 0.1; Deviation -0.4; Fee 0.0681588951206413*fixed_1()
     * Set basket to contain 0 tokens of x and 89 tokens of y. Call transactionFee(x,11).
     * Results: Proportion 0.11; Deviation -0.39; Fee 0.06699740308471755*fixed_1()
     * Set basket to contain 0 tokens of x and 11 tokens of y. Call transactionFee(x,89).
     * Results: Proportion 0.89; Deviation 0.39; Fee 0.13300259691528246*fixed_1()
     * Set basket to contain 0 tokens of x and 10 tokens of y. Call transactionFee(x,90).
     * Result should be revert.
     * TODO: Convert back to MIX wei at the end.
     */
    function transactionFee(address _token, uint256 _amount, int8 _transactionType)
        public
        view
        returns (int256) 
    {
        // Basket position after deposit, make sure these are fixed point units
        TokenData memory token = tokens[_token];
        int256 deviation = deviationAfterTransaction(_token, _amount, _transactionType);

        // SPLIT ON _trasactionType

        // When the deviation goes below this value the fee becomes constant
        int256 lowerBound = FixidityLib.newFixedFraction(-4,10);

        // When the deviation goes above this value the deposit is rejected
        int256 upperBound = FixidityLib.newFixedFraction(4,10);

        int256 fee = minimumFee;

        // Behaviour when we have very few of _token
        if (deviation <= lowerBound ) {
            int256 lowerMultiplier = LogarithmLib.log_b(
                10,
                FixidityLib.newFixedFraction(1,11)
            );
            fee = FixidityLib.add(
                token.depositFee, // PAY ATTENTION WHEN SPLITTING
                FixidityLib.multiply(
                    FixidityLib.multiply(
                        token.depositFee,  // PAY ATTENTION WHEN SPLITTING
                        scalingFactor
                    ),
                    lowerMultiplier
                )
            );
        // Normal behaviour
        } else if (lowerBound < deviation && deviation < upperBound) {
            int256 t2 = FixidityLib.divide(
                token.targetProportion,
                FixidityLib.newFixed(2)
            );
            int256 deviationLogit = FixidityLib.divide(
                FixidityLib.add(
                    deviation,
                    t2
                ),
                FixidityLib.subtract(
                    deviation,
                    t2
                )
            );
            int256 normalMultiplier = LogarithmLib.log_b(
                10,
                deviationLogit
            );
            fee = FixidityLib.add(
                token.depositFee,  // PAY ATTENTION WHEN SPLITTING
                FixidityLib.multiply(
                    FixidityLib.multiply(
                        token.depositFee,  // PAY ATTENTION WHEN SPLITTING
                        scalingFactor
                    ),
                    normalMultiplier
                )
            );
        }
        // Behaviour when we have too many of _token
	    else revert(
            "Token not accepted, basket has too many."
        );
        if (fee > minimumFee) return fee;
        else return minimumFee;
    }
}
