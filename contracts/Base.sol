pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title Base contract.
 */
contract Base {
    using SafeMath for uint256;

    /**
     * @dev Scaling factor for the calculation of fees, expressed in fixed 
     * point units.
     * Test scalingFactor = FixidityLib.fixed_1()
     */
    int256 constant public scalingFactor = 1000000000000000000000000000000000000;

    /**
     * @dev Minimum that can be returned when calculating a fee, expressed in
     * fixed point units.
     * Test minimumFee = FixidityLib.fixed_1()/(10**6)
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
     * @dev This is one of the possible solutions allowing to check
     * if an address is an implementation of an interface.
     * See https://stackoverflow.com/questions/45364197
     */
    modifier isCompliantToken(address _token) {
        uint size;
        // See https://stackoverflow.com/a/40939341 to understand the following test.
        // Make sure to never use this test alone, as it can yeld fake positives when
        // inverted. It *must* be used in conjunction of other tests, eg methods existence.
        // solium-disable-next-line security/no-inline-assembly
        assembly { size := extcodesize(_token) }
        require(
            size > 0, "The specified address doesn't look like a deployed contract."
        );

        require(
            IERC20(_token).balanceOf(_token) >= 0 &&
            IERC20(_token).totalSupply() >= 0,
            "The provided address doesn't look like a valid ERC20 implementation."
        );
        _;
    }

    /**
     * @dev In order to make the code easier to read
     * this method is only a group of requires
     */
    modifier isAcceptedToken(address _token) {
        TokenData memory token = tokens[_token];
        require(
            token.approved == true,
            "The given token isn't listed as accepted."
        );
        require(
            token.proportion > 0,
            "The given token is accepted but doesn't have a target proportion."
        );
        _;
    }

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
        returns (uint256)
    {
        uint256 balance = 0;
        uint256 tokenBalance;
        uint256 totalTokens;
        address[] memory tokensInBasket;
        
        (tokensInBasket, totalTokens) = getApprovedTokens();

        for ( uint256 i = 0; i < totalTokens; i += 1 )
        {
            tokenBalance = IERC20(tokensInBasket[i]).balanceOf(address(this));
            balance = balance.add(tokenBalance);
        }
        return balance;
    }

    /**
     * @dev (C20) Cast safely from uint256 (token balances) to int256 (proportions and fees)
     */
    function safeCast(uint256 x) 
        public 
        pure 
        returns(int256)
    {
        assert(x >= 0);
        assert(x <= 115792089237316195423570985008687907853269984665640564039457584007913129639935); 
        return int256(x);
    } 
}
