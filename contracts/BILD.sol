pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./BILDGovernance.sol";
import "./UtilsLib.sol";

/**
 * @title BILD Staking contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements staking of BILD tokens towards a Curation Agent Ranking
 */
contract BILD is BILDGovernance {
    using SafeMath for uint256;

    /**
     * @notice Constructor with the details of the ERC20Detailed.
     * BILD is constructed with 18 decimals and 10**9 tokens are minted and
     * assigned to the distributor account.
     */
    constructor(address _distributor, address _whitelist) 
        public BILDGovernance(_distributor, _whitelist) 
    {
    
    }

    /**
     * @notice Allows a stakeholder to nominate an agent.
     * @param _agent The agent to nominate or stake for.
     * @param _stake Amount of BILD wei to stake.
     */
    function nominateAgent(
        address _agent, 
        uint256 _stake, 
        string memory _name, 
        string memory _contact
    )
    public
    {
        require(
            !UtilsLib.stringIsEmpty(_name),
            "An agent name must be provided."
        );
        require (
            _stake >= minimumStake,
            "Minimum stake to nominate an agent not reached."
        );
        require (
            stakesByAgent[_agent].length == 0,
            "The agent is already nominated."
        );
        require (
            !nameExists(_name),
            "An agent already exists with that name."
        );

        // Create an agent by giving him an empty stake from the stakeholder.
        agents[_agent] = Agent(_name, _contact, NULL_ADDRESS); // TODO: This should be done inside insertAgent
        stakesByAgent[_agent].push(Stake(msg.sender, 0));
        insertAgent(_agent);
        createStake(_agent, _stake);
    }

    /**
     * @notice Allows a stakeholder to stake BILD for a nominated agent.
     * one.
     * @param _agent The agent to nominate or stake for.
     * @param _stake Amount of BILD wei to stake.
     */
    function createStake(address _agent, uint256 _stake)
    public
    agentExists(_agent)
    {
        require (
            _stake <= ERC20(address(this)).balanceOf(msg.sender) - stakesByHolder[msg.sender],
            "Attempted stake larger than BILD balance."
        );

        // Look for a stake for the agent from the stakeholder.
        uint256 stakeIndex = findStakeIndex(_agent, msg.sender);
        // If the agent has no earlier stakes by the stakeholder create one
        if (stakeIndex == NO_STAKES)
            stakesByAgent[_agent].push(
                Stake(msg.sender, _stake)
            );
        else
            stakesByAgent[_agent][stakeIndex].value = stakesByAgent[_agent][stakeIndex].value.add(_stake);
        
        // Update aggregated stake views
        stakesByHolder[msg.sender] = stakesByHolder[msg.sender].add(_stake);
        
        // Place the agent in the right place of the agents list
        sortAgent(_agent);
    }

    /**
     * @notice Allows a stakeholder to decrease or remove a BILD stake for an agent.
     * @param _agent The agent reduce or remove the stake for.
     * @param _stake Amount of BILD wei to remove from the stake.
     */
    function removeStake(address _agent, uint256 _stake)
    public
    agentExists(_agent)
    {
        // Look for a stake for the agent from the stakeholder.
        uint256 stakeIndex = findStakeIndex(_agent, msg.sender);
        require (
            stakeIndex != NO_STAKES,
            "No stakes were found for the agent."
        );
        
        require (
            _stake <= stakesByAgent[_agent][stakeIndex].value,
            "Attempted to reduce a stake by more than its value."
        );
        // Reduce the stake
        stakesByAgent[_agent][stakeIndex].value -= _stake;

        // Update aggregated stake views
        stakesByHolder[msg.sender] = stakesByHolder[msg.sender].sub(_stake);


        // Place the agent in the right place of the agents list
        sortAgent(_agent);

        // Agents cannot stay nominated with an aggregated stake under the minimum stake.
        if (aggregateAgentStakes(_agent) < minimumStake) 
            revokeNomination(_agent);
    }


    /**
     * @notice Removes all stakes for an agent, effectively revoking its 
     * nomination. This function requires that the aggregated stakes for the
     * agent are below the minimum stake for nomination.
     * @param _agent The stakeholder to revoke the nomination from.
     */
    function revokeNomination(address _agent)
        public
        agentExists(_agent)
    {
        require (
            aggregateAgentStakes(_agent) < minimumStake,
            "Too many stakes to revoke agent nomination."
        );

        // We pop each stake from the agent after updating the aggregate holder stakes view 
        while (stakesByAgent[_agent].length > 0)
        {
            uint256 lastStake = stakesByAgent[_agent].length.sub(1);
            address lastStakeholder = stakesByAgent[_agent][lastStake].stakeholder;
            stakesByHolder[lastStakeholder] = stakesByHolder[lastStakeholder].sub(
                stakesByAgent[_agent][lastStake].value
            );
            stakesByAgent[_agent].pop();
        }

        eraseAgent(_agent);
    }
    // TODO: Fail on transactions if amountToTransfer > ERC20(address(this)).balanceOf(msg.sender) - stakesByHolder[msg.sender]

    /**
     * @notice Determines whether an agent exists with a given name.
     * @param _name The name to look for
     */
    function nameExists(string memory _name)
        public
        view
        returns(bool)
    {
        address agent = highestAgent;
        while (agent != NULL_ADDRESS)
        {
            if(UtilsLib.stringsAreEqual(agents[agent].name, _name)) return true;
            agent = agents[agent].lowerAgent;
        }
        return false;
    }    
}