pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
 * @title BILD Staking contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements staking of BILD tokens towards a Curation Agent Ranking
 */
contract BILD is IERC20 {
    /**
     * @notice Minimum BILD wei that are accepted to nominate a new Curation Agent
     */
    uint256 minimumStake = 100000000000000000000;

    /**
     * @notice A single stake of BILD from one stakeholder to one agent.
     */
    struct Stake {
        address agent;
        uint256 value;
    }

    /**
     * @notice All BILD stakes.
     */
    mapping(address => Stake[]) globalStakes;

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
     * @notice Update of the agent ranking, maintaining the linked list 
     * structure.
     * @param _agent Agent to rank.
     * @param _initial Position in the ranking to start the update process.
     */
    function rankAgent(address _agent, address _initial)
        public
    {
        if (address(agentRanking[_initial]) == 0) return; // Not an address in the ranking
        address current = _initial;
        uint256 thisValue = agentRanking[_agent].value;
        uint256 lastValue = agentRanking[current].value;
        if (lastValue >= thisValue) return; // _agent value below _initial value
        while (lastValue < thisValue) {
            if (agentRanking[current].next == 0) // Found the head
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
     * @notice Returns the aggregation of all stakes by a stakeholder.
     * @param _stakeholder The stakeholder to aggregate stakes for.
     */
    function staked(address _stakeholder)
        public
        view
        returns(uint256)
    {
        Stake[] memory stakes = globalStakes[_stakeholder];
        uint256 result = 0;
        for (uint256 i = 0; i <= stakes.length; i++)
            result += stakes[i].value;
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
            _stake < BILD.balanceOf(msg.sender) - staked(msg.sender),
            "Attempted stake larger than BILD balance."
        );

        require (
            agentRanking[_agent] > 0 || _stake >= minimumStake, 
            "Minimum stake not reached to nominate an agent."
        );

        // Create stake
        Stake storage stake = new Stake();
        stake.value = _stake;
        globalStakes[msg.sender].push(stake);
        
        // Update agent aggregate stakes
        agentRanking[_agent].value += stake.value;

        // If the aggregated stakes are high enough, update the agent ranking.
        if (agentRanking[_agent].value > agentRanking[agentR].value)
        {
            rankAgent(_agent, agentR);
            agentR = agentRanking[agentR].next;
        }
    }
}