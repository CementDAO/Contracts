pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./fixidity/FixidityLib.sol";
import "./fixidity/LogarithmLib.sol";
import "./Governance.sol";


/**
 * @title Fees contract.
 */
contract Fees is Governance {
    using SafeMath for uint256;

    /**
     * @dev (C13) As a Stablecoin Holder, I would like to be
     * able to pay any fees with any of the stablecoins on the basket list
     */
    function setPayFeesWith(address _token) public {
        payFeesWith[msg.sender] = _token;
    }

    /**
     * @dev (C5) As a Governance Function, I would like a API, which may only
     * be accessed by the whitelisted addresses, and which allows me
     * to set the base fee for deposit transactions. The fee is set in fixed
     * point units in which fixed_1() is equal to 1.
     * Test setDepositFee(minimumFee) works and token.depositFee returns minimumFee
     * Test setDepositFee(minimumFee-1) throws
     */
    function setDepositFee(address _token, int256 _fee)
        public
        isAcceptedToken(_token)
        onlyGovernor()
    {
        require(_fee >= minimumFee, "Fees can't be set to less than the minimum fee.");
        TokenData memory token = tokens[_token];
        token.depositFee = _fee;
        tokens[_token] = token;
    }

    /**
     * @dev (C20) Returns what would be the proportion of a token in the basket
     * after adding a number of tokens. This function takes the amount of tokens
     * will throw if the amount of tokens deposited is greater than
     * FixidityLib.max_fixed_add() or the token balance goes above 
     * FixidityLib.max_fixed_div().
     * This function returns values in the [0,fixed_1()] range.
     * Testing: With an empty basket.
     * Test proportionAfterDeposit(token,1) returns fixed_1
     * Assuming tokens x and y have the same number of decimals
     * Introduce 1 token of x into the basket.
     * Test proportionAfterDeposit(x,1) returns fixed_1
     * Test proportionAfterDeposit(y,1) returns fixed_1/2
     */
    function proportionAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        //assert(tokenBalance < FixidityLib.max_fixed_add());
        //assert(amount < FixidityLib.max_fixed_add());
        int256 tokenBalance = FixidityLib.newFixed(
            // The command below returns the balance of _token with this.decimals precision
            convertTokens(_token, address(this)), 
            // We specify that this already uses a fixed point representation of decimals 
            // to convert to the library representation and be able to use the add function
            this.decimals()
        );
        int256 amount = FixidityLib.newFixed(
            convertTokensAmount(_token, address(this), _amount), 
            this.decimals()
        );
        tokenBalance = FixidityLib.add(
            tokenBalance, 
            amount
        );
        
        assert(tokenBalance < FixidityLib.max_fixed_div()); // Should I use require here?
        int256 result = FixidityLib.divide(
            tokenBalance,
            FixidityLib.newFixed(
                safeCast(basketBalance()),
                this.decimals()
            )
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
     * Test deviationAfterDeposit(x,1) returns 1
     * Introduce 1 token of type y (not x) to the basket.
     * Test deviationAfterDeposit(x,1) returns -0.5
     * Set targetProportion of token x to 0
     * Test deviationAfterDeposit(x,1) returns 0.5
     */
    function deviationAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        TokenData memory token = tokens[_token];
        int256 result = FixidityLib.subtract(
            proportionAfterDeposit(_token, _amount),
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
     * Test deviation = -0.4, proportion = 0.5, base = fixed_1()/10
     *      proportionAfterDeposit = 0.1, proportion = 0.5
     *      Set proportion to 0.5 for token x. Set basket to contain just 90 tokens of token y. Call depositFee(x,10);
     * Test deviation = -0.39, proportion = 0.5, base = fixed_1()/10
     *      proportionAfterDeposit = 0.11, proportion = 0.5
     *      Set proportion to 0.5 for token x. Set basket to contain just 89 tokens of token y. Call depositFee(x,11);
     * Test deviation = 0.39, proportion = 0.5, base = fixed_1()/10
     *      proportionAfterDeposit = 0.89, proportion = 0.5
     *      Set proportion to 0.5 for token x. Set basket to contain just 11 tokens of token y. Call depositFee(x,89);
     * Test deviation = 0.4, proportion = 0.5, base = fixed_1()/10
     *      proportionAfterDeposit = 0.9, proportion = 0.5
     *      Set proportion to 0.5 for token x. Set basket to contain just 10 tokens of token y. Call depositFee(x,90);
     * TODO: Check whether any FixidityLib maximums could be breached.
     */
    function depositFee(address _token, uint256 _amount)
        public
        view
        returns (int256) 
    {
        // Basket position after deposit, make sure these are fixed point units
        TokenData memory token = tokens[_token];
        int256 deviation = deviationAfterDeposit(_token, _amount);

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
                token.depositFee,
                FixidityLib.multiply(
                    FixidityLib.multiply(
                        token.depositFee,
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
                token.depositFee,
                FixidityLib.multiply(
                    FixidityLib.multiply(
                        token.depositFee,
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
