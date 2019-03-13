pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./BILDGovernance.sol";
import "./Whitelist.sol";
import "./UtilsLib.sol";

/**
 * @title BILD Staking contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements staking of BILD tokens towards a Curation Agent Ranking
 */
contract BILD is BILDGovernance {
    using SafeMath for uint256;

    /**
     * @notice Constructor of the BILD Business Layer. BILD is constructed with 18 decimals 
     * and 10**9 tokens are minted and assigned to the distributor account.
     * @param _distributor The account that will receive all BILD tokens on contract creation.
     * @param _whitelist The address for the governance and BILD holding authorized individuals.
     */
    constructor(address _distributor, address _whitelist) 
        public BILDGovernance(_distributor, _whitelist) 
    {
    
    }

    /**
     * @notice Verifies that an address is whitelisted as a BILD Stakeholder.
     */
    modifier onlyStakeholder(address _address)
    {
        require(
            Whitelist(whitelist).isStakeholder(msg.sender) == true,
            "This address is not authorized to hold BILD tokens."
        );
        _;
    }

    modifier hasFreeBILD(uint256 _bild)
    {
        require (
            _bild <= ERC20(address(this)).balanceOf(msg.sender) - stakesByHolder[msg.sender],
            "Not enough BILD are available."
        );
        _;
    }

    /**
     * @notice Transfer BILD to a specified address
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     */
    function transfer(address _to, uint256 _value) 
        public 
        onlyStakeholder(_to)
        hasFreeBILD(_value)
        returns(bool)
    {
        _transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * @dev TODO: Should I implement transferFrom or make it throw?
     * @notice Transfer BILD from one address to another.
     * Note that while this function emits an Approval event, this is not required as per the specification,
     * and other compliant implementations may not emit the event.
     * @param _from address The address which you want to send tokens from
     * @param _to address The address which you want to transfer to
     * @param _value uint256 the amount of tokens to be transferred
     */
    /* function transferFrom
    (
        address _from, 
        address _to, 
        uint256 _value
    ) 
        public 
        onlyStakeholder(_to)
        hasFreeBILD(_value)
        returns(bool)
    {
        return _transferFrom(_from, _to, _value);
    } */

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
    hasFreeBILD(_stake)
    {
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

    /**
     * @notice Calculates the number of Curating Agents
     * @dev Currently this returns 10 or the number of Nominated Agents, whichever is lower.
     */
    function calculateR()
        public
        view
        returns(uint256)
    {
        address current = highestAgent;
        uint256 _R = 0;
        while (current != NULL_ADDRESS){
            _R += 1;
            if (_R >= R) break;
            current = agents[current].lowerAgent;
        }
        return _R;
    }

    /**
     * @notice Calculates the proportion of an agent payout due to a stakeholder.
     * @param _agentPayout The payout to distribute for a given agent.
     * @param _agentStakes The aggregated stakes for a given agent.
     * @param _stake The stake that the payout is for. 
     */
    function stakePayout(uint256 _agentPayout, uint256 _agentStakes, uint256 _stake)
        public
        pure
        returns(uint256)
    {
        return _agentPayout * (_stake / _agentStakes); // TODO: Needs to use Fixidity or SafeMath for multiplication
    }

    /**
     * @notice Distributes a fee pool to an agent and its stakeholders.
     * @param _agentPayout The fees due for _agent.
     * @param _agent An agent with fees due.
     */
    function payFees(uint256 _agentPayout, address _agent)
        private
    {
        require(
            MIXRContract != NULL_ADDRESS, 
            "The address for the MIXR Contract needs to be set first."
        );
        // Pay to the agent first
        IERC20(MIXRContract).approve(address(this), _agentPayout / 2);
        IERC20(MIXRContract).transferFrom(address(this), _agent, _agentPayout / 2);
        uint256 stakeholdersPayout = _agentPayout / 2;

        // Pay to the stakeholders
        Stake[] memory agentStakes = stakesByAgent[_agent];
        for (uint256 stakeIndex = 0; stakeIndex < agentStakes.length; stakeIndex += 1)
        {
            Stake memory stake = agentStakes[stakeIndex];
            uint256 payout = stakePayout(
                stakeholdersPayout,
                aggregateAgentStakes(_agent),
                stake.value
            );
            // Send the fee in MIX to the stakeholder account
            IERC20(MIXRContract).approve(address(this), payout);
            IERC20(MIXRContract).transferFrom(address(this), stake.stakeholder, payout);

        }
    }

    /**
     * @notice Calculates the aggregated stakes for the R top rated agents.
     * @param _R The number of agents to aggregate stakes for, starting by the top rated agent.
     */
    function totalStakes(uint256 _R)
        public
        view
        returns(uint256)
    {
        uint256 _stakes = 0;
        address currentAgent = highestAgent;
        for (uint256 agentIndex = 0; agentIndex < _R; agentIndex += 1){
            _stakes += aggregateAgentStakes(currentAgent);
            currentAgent = agents[currentAgent].lowerAgent;
            // TODO: Throw here if current == NULL_ADDRESS
        }
        return _stakes;
    }

    /**
     * @notice Pays accumulated fees to R top rated agents and their stakeholders.
     */
    function payoutFees()
        private
    {
        // TODO: Return if the MIXR balance of the BILD contract is zero
        uint256 _R = calculateR(); // This must ensure a valid R at or below the total number f agents is returned.
        uint256 _totalStakes = totalStakes(_R);
        address currentAgent = highestAgent;
        for (uint256 agentIndex = 0; agentIndex < _R; agentIndex += 1){
            uint256 agentPayout = _totalStakes / aggregateAgentStakes(currentAgent);
            payFees(agentPayout, currentAgent);
            currentAgent = agents[currentAgent].lowerAgent;
        }
    }
}