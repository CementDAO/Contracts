pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./fixidity/FixidityLib.sol";

library Utils {
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
     * to that of _destinationToken. Use the address of the MIXR contract to
     * convert to and from MIX.
     * @dev Test:
     * Create a token x with 18 decimals and a token y with 20 decimals
     * Test convertTokenAmount(x, y, 1) = 100
     * Test convertTokenAmount(y, x, 100) = 1
     * Test convertTokenAmount(y, x, 110) = 1
     */
    function convertTokenAmount(
        address _originToken, 
        address _destinationToken, 
        uint256 _amount
    )
        public
        view
        returns (uint256)
    {
        uint8 originTokenDecimals;
        uint8 destinationTokenDecimals;

        if ( _originToken == address(this)) {
            originTokenDecimals = ERC20Detailed(address(this)).decimals();
        }
        else {
            // assert(tokens.contains(_originToken))
            originTokenDecimals = ERC20Detailed(_originToken).decimals();
        }

        if ( _destinationToken == address(this)) {
            destinationTokenDecimals = ERC20Detailed(address(this)).decimals();
        }
        else {
            // assert(tokens.contains(_destinationToken))
            destinationTokenDecimals = ERC20Detailed(_destinationToken).decimals();
        }

        int256 convertedAmount = FixidityLib.convertFixed(
            safeCast(_amount), 
            originTokenDecimals, 
            destinationTokenDecimals
        );
        assert(convertedAmount >= 0);
        return uint256(convertedAmount);
    } 
}
