pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./BILD.sol";
import "./Whitelist.sol";

/**
 * @title BILD Governance.
 * @author Bernardo Vieira.
 * @notice Implements governance functions for a BILD token.
 */
contract BILDGovernance is BILD {

    address internal whitelist;
    /**
     * @notice Constructor with the details of the ERC20.
     */
    constructor(address _distributor, address _whitelist) 
        public 
        BILD(_distributor)
    {
        whitelist = _whitelist;
    }

    /**
     * @notice Modifier that enforces that the transaction sender is
     * whitelisted to perform governance.
     */
    modifier onlyGovernor() {
        require(
            Whitelist(whitelist).isGovernor(msg.sender),
            "Message sender isn't part of the governance whitelist."
        );
        _;
    }

    /**
     * @notice Set the minimum stake for agent nominations.
     * @param _minimumStake The minimum stake for agent nominations in BILD wei.
     */
    function setMinimumStake(uint256 _minimumStake)
        public
        onlyGovernor()
    {
        minimumStake = _minimumStake;
    }

    /**
     * @notice Return the minimum stake for agent nominations.
     */
    function getMinimumStake()
        public
        view
        returns(uint256)
    {
        return minimumStake;
    }

    /**
     * @notice Set the address of the MIXR contract.
     * @param _mixr The address of the MIXR contract.
     * @dev TODO: Consider doing this as onlyOwner, instead of onlyGovernor.
     */
    function setMIXRContract(address _mixr)
        public
        onlyGovernor()
    {
        MIXRContract = _mixr;
    }

    /**
     * @notice Return the address of the MIXR contract.
     */
    function getMIXRContract()
        public
        view
        returns(address)
    {
        return MIXRContract;
    }
}
