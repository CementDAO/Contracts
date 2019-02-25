pragma solidity ^0.5.0;

import "../UtilsLib.sol";

contract UtilsLibMock {
    /**
     * @notice Cast safely from uint256 (token balances) to int256 (proportions and fees)
     * @param x Number to cast from uint256 to int256
     */
    function safeCast(uint256 x) 
        public 
        pure 
        returns(int256)
    {
        return UtilsLib.safeCast(x);
    }

    /**
     * @notice Converts a token amount from the precision of _originToken
     * to that of _destinationToken. Use the address of the MIXR contract to
     * convert to and from MIX.
     * @dev Test:
     * Create a token x with 18 decimals and a token y with 20 decimals
     * Test convertTokenAmount(x, y, 1) = 100
     * Test convertTokenAmount(y, x, 100) = 1
     * Test convertTokenAmount(y, x, 110) = 1
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
        return UtilsLib.convertTokenAmount(_originTokenDecimals, _destinationTokenDecimals, _amount);
    } 
}
