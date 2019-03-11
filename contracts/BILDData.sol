pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./UtilsLib.sol";

/**
 * @title BILD Data 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements data structures the staking of BILD tokens.
 */
contract BILDData is ERC20, ERC20Detailed {
    using SafeMath for uint256;

    /**
     * @notice Code indicating a stakeholder has no stakes for a given agent
     * @dev Difficult to create such a large array of stakes, so probably safe
     */
    uint256 internal NO_STAKES = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

    /**
     * @notice An initializated address.
     */
    address internal NULL_ADDRESS = address(0);


    /**
     * @notice The address of the MIXR contract.
     * @dev Used only to calculate R from MIXR.totalSupply().
     */
    address internal MIXRContract;

    /**
     * @notice Minimum BILD wei that are accepted to nominate a new Curation Agent
     */
    uint256 internal minimumStake = 10**18;

    /**
     * @notice An agent
     * @dev It is not yet supported to store a dynamic array of structs in a 
     * struct, therefore the agent struct cnnot contain the stakes inside.
     */
    struct Agent {
        string name;
        string contact;
        address lowerAgent;
    }

    /**
     * @notice A single stake of BILD from one stakeholder.
     */
    struct Stake {
        address stakeholder;
        uint256 value;
    }

    /**
     * @notice All the agents stored in a linked list ordered by their aggregated stakes
     */
    mapping(address => Agent) internal agents;

    /**
     * @notice The address of the agent at the top of the list.
     */
    address internal highestAgent;
    
    /**
     * @notice The address of the agent at the top of the list.
     */
    address internal lowestAgent;

    /**
     * @notice The number of agents that can be Curating Agents
     */
    uint256 internal R = 3;

    /**
     * @notice All BILD stakes, mapped by agent address.
     * @dev It might be more gas effective to remove this mapping and just use
     * the agentRanking list to access the stakes.
     */
    mapping(address => Stake[]) internal stakesByAgent;

    /**
     * @notice View of aggregated stakes by stakeholder address.
     * @dev It might be more cost efficient to traverse all stakes which each 
     * transaction and aggregate values than to store this mapping. However, it
     * seems more user friendly to put the cost of the platform on those that
     * create stakes than those that transact with MIX.
     */
    mapping(address => uint256) internal stakesByHolder;

    /**
     * @notice Constructor with the details of the ERC20Detailed.
     * BILD is constructed with 18 decimals and 10**9 tokens are minted and
     * assigned to the distributor account.
     */
    constructor(address _distributor) public ERC20Detailed("BILD", "BILD", 18) {
        _mint(_distributor, 10**27);
    }

    /**
     * @notice Verifies that an agent exists
     * @dev An agent without stakes is considered non existing, and the garbage
     * collection mechanism might remove it at any time.
     */
    modifier agentExists(address _agent)
    {
        require (
            !UtilsLib.stringIsEmpty(agents[_agent].name),
            "Agent not found."
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
     */
    function findStakeIndex(address _agent, address _stakeholder)
        public
        view
        agentExists(_agent)
        returns(uint256)
    {
        uint256 stakeIndex = 0;
        while (stakeIndex < stakesByAgent[_agent].length)
        {
            if (stakesByAgent[_agent][stakeIndex].stakeholder == _stakeholder)
                return stakeIndex;
            stakeIndex += 1;
        }
        return NO_STAKES;
    }

    /**
     * @notice Returns the value in BILD wei of an stake from a stakeholder for an agent.
     * @param _agent The agent that the stake is for.
     * @param _stakeholder The holder that the stake is from.
     */
    function findStakeValue(address _agent, address _stakeholder)
        public
        view
        agentExists(_agent)
        returns(uint256)
    {
        uint256 stakeIndex = findStakeIndex(_agent, _stakeholder);
        if (stakeIndex == NO_STAKES) return 0;
        return stakesByAgent[_agent][stakeIndex].value;
    }

    /**
     * @notice Returns the aggregation of all stakes for an agent.
     * @param _agent The agent to aggregate stakes for.
     * @dev This is a get method, consider writing a set method as well.
     */
    function aggregateAgentStakes(address _agent)
        public
        view
        agentExists(_agent)
        returns(uint256)
    {
        //Stake[] memory agentStakes = stakes[_agent];
        uint256 result = 0;
        for (uint256 i = 0; i < stakesByAgent[_agent].length; i += 1)
            result = result.add(
                stakesByAgent[_agent][i].value
            );
        return result;
    }

    /**
     * @notice Returns the aggregation of all stakes for a holder.
     * @param _stakeholder The stakeholder to aggregate stakes for.
     * @dev This is a get method, consider writing a set method as well.
     */
    function aggregateHolderStakes(address _stakeholder)
        public
        view
        returns(uint256)
    {
        return stakesByHolder[_stakeholder];
    }

    /**
     * @notice Return the address of the highest ranked agent.
     */
    function getHighestAgent()
        public
        view
        returns(address)
    {
        return highestAgent;
    }

    /**
     * @notice Return the address of the lowest ranked agent.
     */
    function getLowestAgent()
        public
        view
        returns(address)
    {
        return lowestAgent;
    }

    /**
     * @notice Find whether an agent is in the agents list
     * @param _agent The agent to verify.
     */
    function agentIsInList(address _agent)
        public
        view
        agentExists(_agent)
        returns(bool)
    {
        address current = highestAgent;
        while (current != NULL_ADDRESS){
            if (current == _agent) return true;
            current = agents[current].lowerAgent;
        }
        return false;
    }

    /**
     * @notice Find the higher agent in the agents list
     * @param _agent The agent to find the higher agent for.
     */
    function higherAgent(address _agent)
        public
        view
        agentExists(_agent)
        returns(address)
    {
        require(
            agentIsInList(_agent),
            "The agent is not in the agents ranking."
        );
        if (_agent == highestAgent) 
            return NULL_ADDRESS;
        
        address current = highestAgent;
        while (agents[current].lowerAgent != _agent){
            current = agents[current].lowerAgent;
            require(
                current != NULL_ADDRESS,
                "The agent is not ranked."
            );
        }
        return current;
    }
    /**
     * @notice Places an agent at the lowest position of the agents list.
     * @param _agent The agent to insert.
     */
    function insertAgent(address _agent)
        public
        agentExists(_agent)
    {
        require(
            !agentIsInList(_agent),
            "Can't insert an agent that is already in the agents ranking."
        );
        // If there are no highestAgent and no lowestAgent then _agent is the only one in the list.
        if (highestAgent == NULL_ADDRESS && lowestAgent == NULL_ADDRESS)
            highestAgent = _agent;
        else
            agents[lowestAgent].lowerAgent = _agent;
        lowestAgent = _agent;
    }

    /**
     * @notice Remove an agent from the list
     * @param _agent The agent to remove.
     */
    function detachAgent(address _agent)
        public // TODO: Public for testing, make private for deployment
        agentExists(_agent)
    {
        require(
            agentIsInList(_agent),
            "The agent is already detached from the ranking."
        );
        if (lowestAgent == _agent && highestAgent == _agent)
        {
            delete lowestAgent;
            delete highestAgent;
            return;
        }
        if (lowestAgent == _agent)
        {
            lowestAgent = higherAgent(_agent);
            delete agents[higherAgent(_agent)].lowerAgent;
            return;
        }
        if (highestAgent == _agent)
        {
            highestAgent = agents[_agent].lowerAgent;
            delete agents[_agent].lowerAgent;
            return;
        }
        agents[higherAgent(_agent)].lowerAgent = agents[_agent].lowerAgent;
        delete agents[_agent].lowerAgent; // TODO: test this
    }

    /**
     * @notice Erase completely an agent from the system
     * @param _agent The agent to erase.
     */
    function eraseAgent(address _agent)
        public // TODO: Public for testing, make private for deployment
        agentExists(_agent)
    {
        // Remove agent from the list
        detachAgent(_agent);

        // Erase agent
        delete agents[_agent].lowerAgent;
        delete agents[_agent].name;
        delete agents[_agent].contact;
    }

    /**
     * @notice Returns the agent _rank positions under _agent
     * @param _agent The agent to start counting from.
     * @param _rank The positions to count.
     * @dev returns NULL_ADDRESS if trying to retrieve an agent from a rank that doesn't exist
     */
    function agentAtRankFrom(address _agent, uint256 _rank)
        public
        view
        returns(address)
    {
        require(
            agentIsInList(_agent),
            "The agent is not in the agents ranking."
        );
        
        address current = _agent;
        for (uint256 i = 0; i < _rank; i += 1){
            current = agents[current].lowerAgent;
            require(
                current != NULL_ADDRESS,
                "Not enough agents in the list."
            );
        }
        return current;
    }

    /**
     * @notice Returns the agent at _rank.
     * @param _rank The rank of the agent returned, with 0 being the highest ranked agent.
     */
    function agentAtRank(uint256 _rank)
        public
        view
        returns(address)
    {
        return agentAtRankFrom(highestAgent, _rank);   
    }

    /**
     * @notice Places an agent in its right place in the agents list.
     * @param _agent The agent to find a place for.
     */
    function sortAgent(address _agent)
        public
        agentExists(_agent)
    {
        detachAgent(_agent);

        // If there are no highestAgent and no lowestAgent then _agent is the only one in the list.
        if (highestAgent == NULL_ADDRESS && lowestAgent == NULL_ADDRESS)
        {
            lowestAgent = _agent;
            highestAgent = _agent;
            return;
        }
        uint256 _agentStakes = aggregateAgentStakes(_agent);
        
        // If _agent should be the highestAgent one we just push it on top
        if (_agentStakes > aggregateAgentStakes(highestAgent))
        {
            agents[_agent].lowerAgent = highestAgent;
            highestAgent = _agent;
            return;
        }
        else
        {
            // If _agent shouldn't be highestAgent and there is only one other agent,
            // then _agent is its lowerAgent and the lowestAgent.
            if (highestAgent == lowestAgent)
            {
                agents[highestAgent].lowerAgent = _agent;
                lowestAgent = _agent;
                return;
            }
            // There are at least two agents and _agent is not the highestAgent, we 
            // traverse down until we find a lowerAgent agent, and we sort _agent
            address current = highestAgent;
            // While we are not at the lowestAgent
            while (current != lowestAgent){
                // Found the spot?
                if (aggregateAgentStakes(agents[current].lowerAgent) < _agentStakes){
                    agents[_agent].lowerAgent = agents[current].lowerAgent;
                    agents[current].lowerAgent = _agent;
                    return; // Current had a lowerAgent, so now _agent has a lowerAgent and cannot be the lowestAgent.    
                }
                current = agents[current].lowerAgent;
            }
            // _agent is the new lowestAgent then.    
            agents[current].lowerAgent = _agent;
            lowestAgent = _agent;
        }
    }
}