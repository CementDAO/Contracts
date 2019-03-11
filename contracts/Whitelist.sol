pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Whitelist.
 * @author Bernardo Vieira, Alberto Cuesta Canada
 * @notice Implements a whitelist for contract governance.
 */
contract Whitelist is Ownable {

    /**
     * @notice Whitelist of addresses that can do governance.
     */
    mapping(address => bool) internal governors;

    /**
     * @notice Add new user to governors
     * @param _userAddress The user address to be added.
     */
    function addGovernor(address _userAddress)
        public
        onlyOwner
    {
        governors[_userAddress] = true;
    }

    /**
     * @notice Allows to query whether or not a given address is a governor.
     * @param _userAddress The address to be checked.
     * @return true if the provided user is a governor, false otherwise.
     */
    function isGovernor(address _userAddress)
        public
        view
        returns (bool)
    {
        return governors[_userAddress];
    }

    /**
     * @notice Remove user from governors
     * @param _userAddress the user address to remove
     */
    function removeGovernor(address _userAddress)
        public
        onlyOwner
    {
        delete governors[_userAddress];
    }
}
