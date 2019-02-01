pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./fixidity/FixidityLib.sol";
import "./fixidity/LogarithmLib.sol";


/**
 * @title Fees contract.
 */
contract Fees {
    using SafeMath for uint256;

    /**
     * @dev Scaling factor for the calculation of fees, expressed in fixed 
     * point units.
     */
    int256 constant public scalingFactor = 1000000000000000000000000000000000000;

    /**
     * @dev Minimum that can be returned when calculating a fee, expressed in
     * fixed point units.
     */
    int256 constant public minimumFee = 1000000000000000000000000000000;

    /**
     * @dev (C1) Whitelist of addresses that can do governance.
     */
    mapping(address => bool) internal governors;

    struct TokenData {
        /**
         * @dev (C2, C3) This is list of stablecoins that can be stored in the basket,
         * only if their proportion is set to > 0.
         */
        bool approved;
        /**
         * @dev (C4) The proportion of each token we want in the basket
         * using fixed point units in a 0 to FixidityLib.fixed_1() range.
         * ToDo: Change so that it can be sanity-checked that all proportions add
         * up to FixidityLib.fixed_1(). Otherwise we will have to do a costly 
         * conversion with each fee calculation.
         */
        int256 proportion;
        /**
         * @dev (C20) The base deposit fees for each token in the basket using 
         * fixidity units in a 0 to FixidityLib.max_fixed_mul() range.
         */
        int256 depositFee;
    }

    mapping(address => TokenData) internal tokens;
    /**
     * Since it's not possible to iterate over a mapping, it's necessary
     * to have an array, so we can iterate over it and verify all the
     * information on the mapping.
     */
    address[] internal tokensList;

    /**
     * @dev Returns an address array of approved tokens, and it's size
     */
    function getApprovedTokens() 
        public 
        view 
        returns(address[] memory, uint256) 
    {
        uint256 totalAddresses = tokensList.length;
        uint256 activeIndex = 0;
        address[] memory activeAddresses = new address[](totalAddresses);
        for (uint256 totalIndex = 0; totalIndex < totalAddresses; totalIndex += 1) {
            TokenData memory token = tokens[tokensList[totalIndex]];
            if (token.approved == true) {
                activeAddresses[activeIndex] = tokensList[totalIndex];
                activeIndex += 1; // Unlikely to overflow
            }
        }
        return (activeAddresses, activeIndex);
    }

    /**
     * @dev (C20) Returns the total amount of tokens in the basket.
     * TODO: Make sure that no redemptions are accepted for a token if this would
     * bring its balance in the basket below 0.
     */
    function basketBalance()
        public
        view
        returns (int256)
    {
        int256 balance = 0;
        int256 tokenBalance;
        int256 uncheckedBalance;
        uint256 totalTokens;
        address[] memory tokensInBasket;
        
        (tokensInBasket, totalTokens) = getApprovedTokens();

        for ( uint256 i = 0; i < totalTokens; i += 1 )
        {
            tokenBalance = int256(IERC20(tokensInBasket[i]).balanceOf(address(this)));
            uncheckedBalance = balance + tokenBalance;
            // Protected against overflow
            assert(uncheckedBalance - tokenBalance == balance);
            balance = uncheckedBalance;
        }
        return balance;
    }

    /**
     * @dev (C20) Returns what would be the proportion of a token in the basket
     * after adding a number of tokens. This function uses fixed point units 
     * and is the reason for the maximum token balance to be 
     * FixidityLib.max_fixed_div(). It won't allow deposits if the token
     * balance goes above FixidityLib.max_fixed_div().
     */
    function proportionAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        uint256 uncheckedBalance = IERC20(_token).balanceOf(address(this)).add(_amount);
        assert(uncheckedBalance < uint256(FixidityLib.max_fixed_div())); // Safe cast

        int256 tokenBalance = int256(uncheckedBalance);
        return FixidityLib.divide(
            FixidityLib.newFromInt256(tokenBalance),
            FixidityLib.newFromInt256(basketBalance())
        );
    }

    /**
     * @dev (C20) Returns what would be the deviation from the target 
     * proportion of a token in the basket after adding a number of tokens.
     * This function uses fixed point units in the 0 to FixidityLib.fixed_1()
     * range.
     */
    function deviationAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        TokenData memory token = tokens[_token];
        return FixidityLib.subtract(
            proportionAfterDeposit(_token, _amount),
            token.proportion
        );
    }

    /**
     * @dev (C20) Calculates the deposit fee as decribed in the CementDAO.
     * whitepaper. Uses fixed point units from FixidityLib.
     * TODO: Draft tests
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
        int256 proportion = token.proportion;
        int256 base = token.depositFee;

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
                base,
                FixidityLib.multiply(
                    FixidityLib.multiply(
                        base,
                        scalingFactor
                    ),
                    lowerMultiplier
                )
            );
        // Normal behaviour
        } else if (lowerBound < deviation && deviation < upperBound) {
            int256 t2 = FixidityLib.divide(
                proportion,
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
                base,
                FixidityLib.multiply(
                    FixidityLib.multiply(
                        base,
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
