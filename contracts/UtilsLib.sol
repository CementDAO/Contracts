pragma solidity ^0.5.7;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "fixidity/contracts/FixidityLib.sol";


library UtilsLib {
    /**
     * @notice Cast safely from uint256 (token balances) to int256 (proportions and fees)
     * @param x Number to cast from uint256 to int256
     */
    function safeCast(uint256 x) 
        public 
        pure 
        returns(int256)
    {
        assert(x >= 0);
        assert(x <= 57896044618658097711785492504343953926634992332820282019728792003956564819967); 
        return int256(x);
    }

    /**
     * @notice Converts a token amount from the precision of _originToken
     * to that of _destinationToken.
     * @param _originTokenDecimals Decimals of the tokens to convert from.
     * @param _destinationTokenDecimals Decimals of the token to convert to.
     * @param _amount Quantity of wei of the origin token to convert.
     */
    function convertTokenAmount(
        uint8 _originTokenDecimals, 
        uint8 _destinationTokenDecimals, 
        uint256 _amount
    )
        public
        pure
        returns (uint256)
    {
        int256 convertedAmount = FixidityLib.convertFixed(
            safeCast(_amount), 
            _originTokenDecimals, 
            _destinationTokenDecimals
        );
        assert(convertedAmount >= 0);
        return uint256(convertedAmount);
    } 

    /**
     * @notice Compare whether two strings are the same
     * @param _a First string.
     * @param _b Second string.
     */
    function stringsAreEqual(string memory _a, string memory _b) 
        public
        pure 
        returns(bool)
    {
        return keccak256(bytes(_a)) == keccak256(bytes(_b));
    }

    /**
     * @notice Return whether a string is empty
     * @param _s A string
     */
    function stringIsEmpty(string memory _s) 
        public
        pure 
        returns(bool)
    {
        return bytes(_s).length == 0;
    }
}
