pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./fixidity/FixidityLib.sol";
import "./fixidity/LogarithmLib.sol";
import "./AddressSetLib.sol";


/**
 * @title Fees contract.
 */
contract Fees {
    using AddressSetLib for AddressSetLib.Data;
    using FixidityLib for FixidityLib.Fixidity;
    using SafeMath for uint256;

    FixidityLib.Fixidity internal fixidity;

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
     * using fixidity units in a 0 to 10^36 range.
     * ToDo: Change so that it can be sanity-checked that all proportions add
     * up to 10^36. Otherwise we will have to do a costly conversion with each
     * fee calculation.
     */
    mapping(address => int256) internal proportions; 

    /**
     * @dev (C20) The base deposit fees for each token in the basket using 
     * fixidity units in a 0 to 10^36 range.
     */
    mapping(address => int256) internal depositFees; 


    /**
     * @dev (C20) Returns the total amount of tokens in the basket.
     */
    function basketBalance()
        public
        view
        returns (int256)
    {
        int256 balance = 0;
        address[] memory tokensInBasket = approvedTokens.getAddresses();

        for ( uint256 i = 0; i < tokensInBasket.length; i += 1 )
        {
            balance += int256(IERC20(tokensInBasket[i]).balanceOf(address(this)));  // Overflow? Truncate?
        }
        return balance;
    }

    /**
     * @dev (C20) Returns what would be the proportion of a token in the basket
     * after adding a number of tokens. This function converts to fixidity
     * units which in plain terms means that the comma is displaced 36 places
     * to the right. The return value is between 0 and 10^36.
     */
    function proportionAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        int256 tokenBalance = int256(IERC20(_token).balanceOf(address(this)).add(_amount));  // Truncate?
        return fixidity.divide(
            fixidity.newFromInt256(tokenBalance),
            fixidity.newFromInt256(basketBalance())
        );
    }

    /**
     * @dev (C20) Returns what would be the deviation from the target 
     * proportion of a token in the basket after adding a number of tokens.
     * This function converts to fixidity units which in plain terms means 
     * that the comma is displaced 36 places to the right. The return value
     * is between 0 and 10^36.
     */
    function deviationAfterDeposit(address _token, uint256 _amount)
        public
        view
        returns (int256)
    {
        return fixidity.subtract(
            proportionAfterDeposit(_token, _amount),
            proportions[_token]
        );
    }

    /**
     * @dev (C20) Calculates the deposit fee as decribed in the CementDAO.
     * whitepaper. Uses fixidity units which in plain terms means that the 
     * comma is displaced 36 places to the right. The return value is between
     * 0 and 10^36.
     *  
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
        int256 lowerBound = fixidity.newFromInt256Fraction(-4,10);

        // When the deviation goes above this value the deposit is rejected
        int256 upperBound = fixidity.newFromInt256Fraction(4,10);

        // Behaviour when we have very few of _token
        if (deviation <= lowerBound ) {
            int256 lowerMultiplier = LogarithmLib.log_any(
                fixidity,
                10,
                fixidity.divide(1,11)
            );
            return fixidity.add(
                base,
                fixidity.multiply(
                    base,
                    lowerMultiplier
                )
            );
        // Normal behaviour
        } else if (lowerBound < deviation && deviation < upperBound) {
            int256 t2 = fixidity.divide(proportion,2);
            int256 deviationSlope = fixidity.divide(
                    fixidity.add(
                        deviation,
                        t2
                    ),
                    fixidity.subtract(
                        deviation,
                        t2
                    )
                );
            int256 normalMultiplier = LogarithmLib.log_any(
                fixidity,
                10,
                deviationSlope
            );
            return fixidity.add(
                base,
                fixidity.multiply(
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
