pragma solidity ^0.5.0;

import "../BILD.sol";

/**
 * @title BILD Staking contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements staking of BILD tokens towards a Curation Agent Ranking
 */
contract BILDTest is BILD {

    /**
     * @notice Constructor of the BILD Business Layer. BILD is constructed as an ERC20Detailed with 18 decimals 
     * and 10**9 tokens are minted and assigned to the distributor account.
     * @param _distributor The account that will receive all BILD tokens on contract creation.
     * @param _whitelist The address for the governance and BILD holding authorized individuals.
     */
    constructor(address _distributor, address _whitelist) 
        public
        BILD( _distributor, _whitelist)
    {
    }

    /**
     * @notice Removes all stakes for an agent, effectively revoking its 
     * nomination. This function requires that the aggregated stakes for the
     * agent are below the minimum stake for nomination.
     * @param _agent The stakeholder to revoke the nomination from.
     */
    function testRevokeNomination(address _agent)
        public
        agentExists(_agent)
    {
        revokeNomination(_agent);
    }

    /**
     * @notice Distributes a fee pool to an agent and its stakeholders.
     * @param _totalPayout The fees due for _agent.
     * @param _agent An agent with fees due.
     * @return The aggregation of fees paid, which can be lower than _agentPayout due to rounding.
     */
    function testPayFeesForAgent(uint256 _totalPayout, address _agent)
        public
        returns(uint256)
    {
        return payFeesForAgent(_totalPayout, _agent);
    }

    /**
     * @notice Pays accumulated fees to R top rated agents and their stakeholders.
     * @return The aggregation of fees paid, which can be lower than the MIX balance of the BILD contract due to rounding.
     */
    function testPayoutFees()
        public
        returns(uint256)
    {
        return payoutFees();
    }
}