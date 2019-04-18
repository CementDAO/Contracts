pragma solidity ^0.5.0;

import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "./IWhitelist.sol";


/**
 * @title Whitelist.
 * @author Bernardo Vieira, Alberto Cuesta Canada
 * @notice Implements a whitelist for contract governance.
 */
contract Whitelist is Initializable, IWhitelist, Ownable {

    /**
     * @notice Whitelist of addresses that can do governance.
     */
    mapping(address => bool) internal governors;


    /**
     * @notice Whitelist of addresses that can hold BILD tokens.
     */
    mapping(address => bool) internal stakeholders;

    /**
     * @notice Modifier that enforces that the transaction sender is
     * whitelisted to perform governance.
     */
    modifier onlyGovernor() {
        require(
            isGovernor(msg.sender),
            "Not allowed."
        );
        _;
    }

    /**
     * @dev nitialize method
     */
    function initialize(address sender) public initializer {
        Ownable.initialize(sender);
    }

    /**
     * @notice Add new user to governors. Only the contract owner can use this method.
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
     * @notice Remove user from governors. Only the contract owner can use this method.
     * @param _userAddress the user address to remove
     */
    function removeGovernor(address _userAddress)
        public
        onlyOwner
    {
        delete governors[_userAddress];
    }

    /**
     * @notice Add new user to stakeholders. Only governors can use this method.
     * @param _userAddress The user address to be added.
     */
    function addStakeholder(address _userAddress)
        public
        onlyGovernor
    {
        stakeholders[_userAddress] = true;
    }

    /**
     * @notice Allows to query whether or not a given address is a stakeholder.
     * @param _userAddress The address to be checked.
     * @return true if the provided user is a stakeholder, false otherwise.
     */
    function isStakeholder(address _userAddress)
        public
        view
        returns (bool)
    {
        return stakeholders[_userAddress];
    }

    /**
     * @notice Remove user from stakeholders. Only governors can use this method.
     * @param _userAddress the user address to remove
     */
    function removeStakeholder(address _userAddress)
        public
        onlyGovernor
    {
        delete stakeholders[_userAddress];
    }
}
