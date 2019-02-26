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
     * be exposed :(
     */
    function findStake(address _agent, address _stakeholder)
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
     * @notice Update of the agent ranking, maintaining the linked list 
     * structure.
     * @param _agent Agent to rank.
     * @param _initial Position in the ranking to start the update process.
     */
    function rankAgent(address _agent, address _initial)
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
    }

    /**
     * @notice Returns the aggregation of all stakes for an agent.
     * @param _agent The agent to aggregate stakes for.
     */
    function aggregateAgentStakes(address _agent)
        public
        view
        returns(uint256)
    {
        //Stake[] memory agentStakes = stakes[_agent];
        uint256 result = 0;
        for (uint256 i = 0; i <= stakesByAgent[_agent].length; i++)
            result += stakesByAgent[_agent][i].value;
        return result;
    }

    /**
     * @notice Allows a stakeholder to stake BILD for an agent, or to nominate
     * one.
     * @param _agent The agent to nominate or stake for.
     * @param _stake Amount of BILD wei to stake.
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
            "Minimum stake not reached to nominate an agent."
        );

        // Look for a stake for the agent from the stakeholder.
        uint256 stakeLocation = findStake(_agent, msg.sender);
        Stake memory stake;
        // If the agent has no earlier stakes by the stakeholder create one
        if (stakeLocation == stakesByAgent[_agent].length) 
            stake = Stake(msg.sender, _stake);
        else
            stake = stakesByAgent[_agent][stakeLocation];
        stakesByAgent[_agent].push(stake);
        
        // Update aggregated stake views
        if (agentRanking[_agent].value == 0) 
            agentRanking[_agent] = AggregatedStakes(address(0), stake.value);
        else 
            agentRanking[_agent].value += stake.value;
        stakesByHolder[msg.sender] += stake.value;

        // If the aggregated stakes are high enough, update the agent ranking.
        if (agentRanking[_agent].value > agentRanking[agentR].value)
        {
            rankAgent(_agent, agentR);
            agentR = agentRanking[agentR].next;
        }
    }
}