pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


/**
 * @title BILD Staking contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements staking of BILD tokens towards a Curation Agent Ranking
 */
contract BILD is ERC20, ERC20Detailed {
    /**
     * @notice Minimum BILD wei that are accepted to nominate a new Curation Agent
     */
    uint256 minimumStake = 100000000000000000000;

    /**
     * @notice A single stake of BILD from one stakeholder.
     */
    struct Stake {
        address stakeholder;
        uint256 value;
    }

    /**
     * @notice All BILD stakes, mapped by agent address.
     * @dev It might be more gas effective to remove this mapping and just use
     * the agentRanking list to access the stakes.
     */
    mapping(address => Stake[]) stakesByAgent;

    /**
     * @notice View of aggregated stakes by stakeholder address.
     * @dev It might be more cost efficient to traverse all stakes which each 
     * transaction and aggregate values than to store this mapping. However, it
     * seems more user friendly to put the cost of the platform on those that
     * create stakes than those that transact with MIX.
     */
    mapping(address => uint256) stakesByHolder;

    /**
     * @notice One component of a linked list that contained the aggregated 
     * stakes from all stakeholders for each agent.
     */
    struct AggregatedStakes {
        address next;
        uint256 value;
    }

    /**
     * @notice An ordered linked list, or ranking, of the Curation Agents 
     * ordered by their stake size.
     */
    mapping(address => AggregatedStakes) agentRanking;

    /**
     * @notice The address of the agent at the R position of the agentRanking.
     */
    address agentR;

    /**
     * @notice Verifies that an agent exists
     * @dev An agent without stakes is considered non existing, and the garbage
     * collection mechanism might remove it at any time.
     */
    modifier agentExists(address _agent)
    {
        require (
            stakesByAgent[_agent].length != 0, // An agent without any stakes cannot exist.
            "Agent not found."
        );
        _;
    }


    /**
     * @notice Verifies that an agent exists in the ranking
     * @dev An agent with an aggregated stake value of 0 is considered non 
     * existing, and the garbage collection mechanism might remove it at any 
     * time.
     */
    modifier agentIsRanked(address _agent)
    {
        require (
            agentRanking[_agent].value != 0, // An agent without any stakes cannot exist.
            "Agent not ranked."
        );
        _;
    }

    /**
     * @notice Returns the index of an stake between all stakes for an agent.
     * An index equal to the length of the stake array means no stakes were found.
     * @param _agent The agent that the stake is for.
     * @param _stakeholder The holder that the stake is from.
     * @dev It is not possible to return a struct, so the data layer needs to
     * be exposed. This method might become private or internal for deployment.
     * Test findStakeIndex(agent1, stakeholder1) fails - "Agent not found."
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder1: createStake(agent2, 1 token)
     * stakeholder2: createStake(agent1, 1 token)
     * Test findStakeIndex(agent1, stakeholder) returns 0.
     * Test findStakeIndex(agent2, stakeholder) returns 0.
     * Test findStakeIndex(agent1, stakeholder2) returns 1.
     * Test findStakeIndex(agent1, stakeholder3) returns 2.
     */
    function findStakeIndex(address _agent, address _stakeholder)
        public
        view
        agentExists(_agent)
        returns(uint256)
    {
        uint256 stakeIndex = 0;
        while (stakeIndex <= stakesByAgent[_agent].length)
        {
            if (stakesByAgent[_agent][stakeIndex].stakeholder == _stakeholder)
                return stakeIndex;
            stakeIndex++;
        }
        return stakeIndex; // An index equal to the length of the stake array means no stakes were found.
    }

    /**
     * @notice Returns the value in BILD wei of an stake from a stakeholder for an agent.
     * @param _agent The agent that the stake is for.
     * @param _stakeholder The holder that the stake is from.
     * Test findStakeValue(agent1, stakeholder1) fails - "Agent not found."
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder1: createStake(agent2, 2 token)
     * Test findStakeValue(agent1, stakeholder1) returns 1 token.
     * Test findStakeValue(agent2, stakeholder1) returns 2 token.
     */
    function findStakeValue(address _agent, address _stakeholder)
        public
        view
        agentExists(_agent)
        returns(uint256)
    {
        uint256 stakeIndex = findStakeIndex(_agent, _stakeholder);
        return stakesByAgent[_agent][stakeIndex].value;
    }

    /**
     * @notice Returns the aggregation of all stakes for an agent.
     * @param _agent The agent to aggregate stakes for.
     * Test aggregateAgentStakes(agent1) fails - "Agent not found."
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * Test aggregateAgentStakes(agent1) returns 1.
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder1: createStake(agent1, 1 token)
     * Test aggregateAgentStakes(agent1) returns 2.
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder2: createStake(agent2, 1 token)
     * Test aggregateAgentStakes(agent2) returns 1.
     */
    function aggregateAgentStakes(address _agent)
        public
        view
        agentExists(_agent)
        returns(uint256)
    {
        //Stake[] memory agentStakes = stakes[_agent];
        uint256 result = 0;
        for (uint256 i = 0; i <= stakesByAgent[_agent].length; i++)
            result += stakesByAgent[_agent][i].value;
        return result;
    }

    /**
     * @notice Returns the aggregation of all stakes for a holder.
     * @param _stakeholder The stakeholder to aggregate stakes for.
     * Test aggregateHolderStakes(stakeholder1) returns 0.
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * Test aggregateHolderStakes(stakeholder1) returns 1.
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder1: createStake(agent1, 1 token)
     * Test aggregateHolderStakes(stakeholder1) returns 2.
     * Execute:
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder1: createStake(agent1, 1 token)
     * stakeholder2: createStake(agent2, 1 token)
     * Test aggregateHolderStakes(stakeholder2) returns 1.
     */
    function aggregateHolderStakes(address _stakeholder)
        public
        view
        returns(uint256)
    {
        return stakesByHolder[_stakeholder];
    }

    /**
     * @notice Update of the agent ranking, maintaining the linked list 
     * structure.
     * @param _agent Agent to rank.
     * @param _initial Position in the ranking to start the update process.
     */
    /* function rankAgent(address _agent, address _initial)
        public
        agentExists(_initial)
        agentIsRanked(_initial)
        agentExists(_agent)
    {
        address current = _initial;
        uint256 thisValue = agentRanking[_agent].value;
        uint256 lastValue = agentRanking[current].value;
        if (lastValue >= thisValue) return; // _agent value below _initial value
        while (lastValue < thisValue) {
            if (agentRanking[current].next == address(0)) // Found the head
            {
                agentRanking[current].next = _agent;
                return;
            }
            uint256 nextValue = agentRanking[agentRanking[current].next].value;
            if (nextValue >= thisValue) // Found the spot
            {
                agentRanking[_agent].next = agentRanking[current].next;
                agentRanking[current].next = _agent;
                return;
            }
            else // Keep traversing
            {
                current = agentRanking[current].next;
                lastValue = agentRanking[current].value;
            }
        }
    } */

    /**
     * @notice Allows a stakeholder to stake BILD for an agent, or to nominate
     * one.
     * @param _agent The agent to nominate or stake for.
     * @param _stake Amount of BILD wei to stake.
     * Test createStake(_agent, 1) fails with no BILD - "Attempted stake larger than BILD balance."
     * Test createStake(_agent, 2) fails with 1 BILD wei - "Attempted stake larger than BILD balance."
     * Test createStake(_agent, 1) fails with 1 BILD wei - "Minimum stake to nominate an agent not reached."
     * Test createStake(_agent, 1 token) with 1 BILD token executes and findStakeValue(_agent, _stakeholder) returns 1 token.
     * Test createStake(_agent, 1 token) executed twice then findStakeValue(_agent, _stakeholder) returns 2 tokens.
     * Complete findStakeIndex tests.
     * Complete findStakeValue tests.
     * Complete aggregateAgentStakes tests.
     * Complete aggregateHolderStakes tests.
     * TODO: Test rankings after createStake.
     */
    function createStake(address _agent, uint256 _stake)
    public
    {
        require (
            _stake < ERC20(address(this)).balanceOf(msg.sender) - stakesByHolder[msg.sender],
            "Attempted stake larger than BILD balance."
        );

        require (
            agentRanking[_agent].value != 0 || _stake >= minimumStake, 
            "Minimum stake to nominate an agent not reached."
        );

        // Look for a stake for the agent from the stakeholder.
        uint256 stakeIndex = findStakeIndex(_agent, msg.sender);
        Stake memory stake;
        // If the agent has no earlier stakes by the stakeholder create one
        if (stakeIndex == stakesByAgent[_agent].length) 
            stake = Stake(msg.sender, _stake);
        else
            stake = stakesByAgent[_agent][stakeIndex];
        stakesByAgent[_agent].push(stake);
        
        // Update aggregated stake views
        stakesByHolder[msg.sender] += stake.value;
        /* if (agentRanking[_agent].value == 0) 
            agentRanking[_agent] = AggregatedStakes(address(0), stake.value);
        else 
            agentRanking[_agent].value += stake.value;

        // If the aggregated stakes are high enough, update the agent ranking.
        // TODO: Needs to take into account that the agent might already be ranked above agentR
        if (agentRanking[_agent].value > agentRanking[agentR].value)
        {
            rankAgent(_agent, agentR);
            agentR = agentRanking[agentR].next;
        } */
    }

    /**
     * @notice Allows a stakeholder to decrease or remove a BILD stake for an agent.
     * @param _agent The agent reduce or remove the stake for.
     * @param _stake Amount of BILD wei to remove from the stake.
     */
    function removeStake(address _agent, uint256 _stake)
    public
    {
        // Look for a stake for the agent from the stakeholder.
        uint256 stakeIndex = findStakeIndex(_agent, msg.sender);
        require (
            stakeIndex < stakesByAgent[_agent].length,
            "No stakes were found for the agent."
        );
        Stake memory stake = stakesByAgent[_agent][stakeIndex];
        
        require (
            _stake <= stakesByAgent[_agent][stakeIndex].value,
            "Attempted to reduce a stake by more than its value."
        );
        // Reduce the stake
        stakesByAgent[_agent][stakeIndex].value -= _stake;

        // Update aggregated stake views
        assert (stakesByHolder[msg.sender] >= stake.value);
        stakesByHolder[msg.sender] -= stake.value;

        /* assert (agentRanking[_agent].value >= stake.value);
        agentRanking[_agent].value -= stake.value;

        // If the aggregated stakes were high enough to be ranked before the stake reduction, update the agent ranking.
        if (agentRanking[_agent].value + _stake.value >= agentRanking[agentR].value)
        {
            rankAgent(_agent, agentR);
            agentR = agentRanking[agentR].next;
        } */
    }

    // TODO: Fail on transactions if amountToTransfer > ERC20(address(this)).balanceOf(msg.sender) - stakesByHolder[msg.sender]
}