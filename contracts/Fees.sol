pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./fixidity/FixidityLib.sol";
import "./fixidity/LogarithmLib.sol";
import "./AddressSetLib.sol";


/**
 * @title Fees contract.
 */
contract Fees {
    using AddressSetLib for AddressSetLib.Data;
    using SafeMath for uint256;

    /**
     * @dev (C1) Whitelist of addresses that can do governance.
     */
    AddressSetLib.Data internal governors;

    /**
     * @dev (C2, C3) This is list of stablecoins that can be stored in the basket,
     * only if their proportion is set to > 0.
     */
    AddressSetLib.Data internal approvedTokens; 

    /**
     * @dev (C4) The proportion of each token we want in the basket
     * using fixed point units in a 0 to FixidityLib.fixed_1() range.
     * ToDo: Change so that it can be sanity-checked that all proportions add
     * up to FixidityLib.fixed_1(). Otherwise we will have to do a costly 
     * conversion with each fee calculation.
     */
    mapping(address => int256) internal proportions; 

    /**
     * @dev (C20) The base deposit fees for each token in the basket using 
     * fixidity units in a 0 to FixidityLib.max_fixed_mul() range.
     */
    mapping(address => int256) internal depositFees; 


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
        address[] memory tokensInBasket = approvedTokens.getAddresses();

        for ( uint256 i = 0; i < tokensInBasket.length; i += 1 )
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
        return FixidityLib.subtract(
            proportionAfterDeposit(_token, _amount),
            proportions[_token]
        );
    }

    /**
     * @dev (C20) Calculates the deposit fee as decribed in the CementDAO.
     * whitepaper. Uses fixed point units from FixidityLib.
     * TODO: Check whether any FixidityLib maximums could be breached.
     */
    function depositFee(address _token, uint256 _amount)
        public
        view
        returns (int256) 
    {
        // Basket position after deposit
        int256 deviation = deviationAfterDeposit(_token, _amount);
        int256 proportion = proportions[_token];
        int256 base = depositFees[_token];

        // When the deviation goes below this value the fee becomes constant
        int256 lowerBound = FixidityLib.newFromInt256Fraction(-4,10);

        // When the deviation goes above this value the deposit is rejected
        int256 upperBound = FixidityLib.newFromInt256Fraction(4,10);

        // Behaviour when we have very few of _token
        if (deviation <= lowerBound ) {
            int256 lowerMultiplier = LogarithmLib.log_any(
                10,
                FixidityLib.divide(1,11)
            );
            return FixidityLib.add(
                base,
                FixidityLib.multiply(
                    base,
                    lowerMultiplier
                )
            );
        // Normal behaviour
        } else if (lowerBound < deviation && deviation < upperBound) {
            int256 t2 = FixidityLib.divide(proportion,2);
            int256 deviationSlope = FixidityLib.divide(
                    FixidityLib.add(
                        deviation,
                        t2
                    ),
                    FixidityLib.subtract(
                        deviation,
                        t2
                    )
                );
            int256 normalMultiplier = LogarithmLib.log_any(
                10,
                deviationSlope
            );
            return FixidityLib.add(
                base,
                FixidityLib.multiply(
                    base,
                    normalMultiplier
                )
            );
        }
        // Behaviour when we have too many of _token
	    else revert(
            "Token not accepted, basket has too many."
        );
    }
}
