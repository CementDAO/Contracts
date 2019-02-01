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
     * @dev (C5) As a Governance Function, I would like a API, which may only
     * be accessed by the whitelisted addresses, and which allows me
     * to set the base fee for deposit transactions
     */
    function setDepositFee(address _token, int256 _fee)
        public
        isAcceptedToken(_token)
        onlyGovernor()
    {
        TokenData memory token = tokens[_token];
        token.depositFee = _fee;
        tokens[_token] = token;
    }

    /**
     * @dev (C20) Returns what would be the proportion of a token in the basket
     * after adding a number of tokens. This function uses FixidityLib fixed 
     * point units and will throw if the token balance goes above 
     * FixidityLib.max_fixed_div().
     * This function returns values in the [0,fixed_1()] range.
     */
    function proportionAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        int256 tokenBalance = safeCast(IERC20(_token).balanceOf(address(this)).add(_amount));
        assert(tokenBalance < FixidityLib.max_fixed_div()); // Should I use require here?

        return FixidityLib.divide(
            FixidityLib.newFromInt256(tokenBalance),
            FixidityLib.newFromInt256(safeCast(basketBalance()))
        );
    }

    /**
     * @dev (C20) Returns what would be the deviation from the target 
     * proportion of a token in the basket after adding a number of tokens.
     * This function returns values in the [-fixed_1(),fixed_1()] range.
     */
    function deviationAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        TokenData memory token = tokens[_token];
        return FixidityLib.subtract(
            proportionAfterDeposit(_token, _amount),
            token.targetProportion
        );
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
        int256 lowerBound = FixidityLib.newFromInt256Fraction(-4,10);

        // When the deviation goes above this value the deposit is rejected
        int256 upperBound = FixidityLib.newFromInt256Fraction(4,10);

        int256 fee = minimumFee;

        // Behaviour when we have very few of _token
        if (deviation <= lowerBound ) {
            int256 lowerMultiplier = LogarithmLib.log_b(
                10,
                FixidityLib.newFromInt256Fraction(1,11)
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
                FixidityLib.newFromInt256(2)
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
