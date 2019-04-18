pragma solidity ^0.5.7;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "./BILDData.sol";
import "./IWhitelist.sol";


/**
 * @title BILD Governance.
 * @author Bernardo Vieira.
 * @notice Implements governance functions the staking of BILD tokens.
 */
contract BILDGovernance is Initializable, BILDData, Ownable {

    address internal whitelist;
    /**
     * @notice Constructor of the BILD Governance layer.
     * @param _whitelist The address for the governance and BILD holding authorized individuals.
     */
    function initialize(address _whitelist) public initializer {
        whitelist = _whitelist;
    }

    /**
     * @notice Modifier that enforces that the transaction sender is
     * whitelisted to perform governance.
     */
    modifier onlyGovernor() {
        require(
            IWhitelist(whitelist).isGovernor(msg.sender),
            "Not allowed."
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
     * @notice Set the address of the MIXR contract. Only the owner can do this.
     * @param _mixr The address of the MIXR contract.
     */
    function setMIXRContract(address _mixr)
        public
        onlyOwner
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
