pragma solidity ^0.5.0;

import "../BILDData.sol";

/**
 * @title BILD Data Test
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Allows testing of internal methods in BILDData.sol.
 */
contract BILDDataTest is BILDData {

    /**
     * @notice Constructor with the details of the ERC20Detailed.
     * BILD is constructed with 18 decimals and 10**9 tokens are minted and
     * assigned to the distributor account.
     */
    constructor(address _distributor) 
        public
        BILDData(_distributor) 
    {
    }

    /**
     * @notice Places an agent at the lowest position of the agents list.
     * @param _agent The agent to insert.
     */
    function testInsertAgent(address _agent)
        public
    {
        agents[_agent] = Agent("name", "contact", NULL_ADDRESS); // TODO: This should be done inside insertAgent
        insertAgent(_agent);
    }

    /**
     * @notice Remove an agent from the list
     * @param _agent The agent to remove.
     */
    function testDetachAgent(address _agent)
        public
    {
        detachAgent(_agent);
    }

    /**
     * @notice Erase completely an agent from the system
     * @param _agent The agent to erase.
     */
    function testEraseAgent(address _agent)
        public
    {
        eraseAgent(_agent);
    }

    /**
     * @notice Places an agent in its right place in the agents list.
     * @param _agent The agent to find a place for.
     */
    function testSortAgent(address _agent)
        public
    {
        sortAgent(_agent);
    }
}