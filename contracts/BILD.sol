pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20.sol";
// import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "./BILDGovernance.sol";
import "./Whitelist.sol";
import "./UtilsLib.sol";

/**
 * @title BILD Staking contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements staking of BILD tokens towards a Curation Agent Ranking
 */
contract BILD is Initializable, BILDGovernance, ERC20, ERC20Detailed {
    using SafeMath for uint256;

    event debug(address _from, uint256 _value);

    /**
     * @notice Constructor of the BILD Business Layer. BILD is constructed as an ERC20Detailed with 18 decimals 
     * and 10**9 tokens are minted and assigned to the distributor account.
     * @param _distributor The account that will receive all BILD tokens on contract creation.
     * @param _whitelist The address for the governance and BILD holding authorized individuals.
     */
    function initialize(address _distributor, address _owner, address _whitelist) 
        public
        initializer
    {
        BILDGovernance.initialize(_owner, _whitelist);
        ERC20Detailed.initialize("BILD", "BILD", 18);
        _mint(_distributor, 10**27);
    }

    /**
     * @notice Verifies that an address is whitelisted as a BILD Stakeholder.
     * @param _address The address to verify.
     * @return True if the address is whitelisted as a BILD stakeholder.
     */
    function isStakeholder(address _address)
        public
        view
        returns(bool)
    {
        return Whitelist(whitelist).isStakeholder(_address) == true;
    }

    /**
     * @notice Verify a stakeholder has a certain unstaked BILD amount.
     * @param _stakeholder The address of the stakeholder to verify the balance for.
     * @param _value The amount to be transferred.
     * @return True if the stakeholder has enough unstaked BILD.
     */
    function hasFreeBILD(address _stakeholder, uint256 _value)
        public
        view
        returns(bool)
    {
        return _value <= ERC20(address(this)).balanceOf(_stakeholder).sub(stakesByHolder[_stakeholder]);
    }

    /**
     * @notice Verifies whether a transfer is restricted
     * @param _from address The address that holds the tokens being sent
     * @param _to address The address receiving the tokens
     * @param _value uint256 the amount of tokens to be transferred
     * @return Zero for no restrictions, an error code otherwise
     */
    function detectTransferRestriction ( 
        address _from, 
        address _to, 
        uint256 _value 
    ) 
        public
        view
        returns (uint8)
    {
        if (!isStakeholder(_to)) return 1;
        if (!hasFreeBILD(_from, _value)) return 2;
        if (_from != msg.sender) return 3;
        return 0;
    } 
    
    /**
     * @notice Converts an error code from detectTransferRestriction to a human readable message.
     * @param _restrictionCode The error code to convert.
     * @return A human readable message.
     */
    function messageForTransferRestriction ( 
        uint8 _restrictionCode 
    ) 
        public
        pure
        returns (string memory)
    {
        if (_restrictionCode == 1) 
            return "This address is not authorized to hold BILD tokens.";
        if (_restrictionCode == 2)
            return "Sender doesn't have enough unstaked BILD.";
        if (_restrictionCode == 3)
            return "TransferFrom not supported.";
        return "No restrictions were found for this transaction.";        
    }

    /**
     * @notice Transfer BILD to a specified address
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     */
    function transfer(address _to, uint256 _value) 
        public 
        returns(bool)
    {
        uint8 transferRestriction = detectTransferRestriction ( 
            msg.sender, _to, _value
        );
        if (transferRestriction != 0)
            revert(messageForTransferRestriction(transferRestriction)); 
        _transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * @notice Transfer BILD from one address to another.
     * @param _from address The address that holds the tokens being sent
     * @param _to address The address receiving the tokens
     * @param _value uint256 the amount of tokens to be transferred
     */
    function transferFrom
    (
        address _from, 
        address _to, 
        uint256 _value
    ) 
        public 
        returns(bool)
    {
        uint8 transferRestriction = detectTransferRestriction ( 
            _from, _to, _value
        );
        if (transferRestriction != 0)
            revert(messageForTransferRestriction(transferRestriction)); 
        // TODO: Need to upgrade to openzeppelin-solidity:2.2.0 and solc >= 0.5.2
        // _approve(_from, msg.sender, allowance(_from, msg.sender).sub(_value));
        _transfer(_from, _to, _value);
        return true;
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
        require(
            hasFreeBILD(msg.sender, _stake),
            "Sender doesn't have enough unstaked BILD."
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
        internal
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
     * @return True if the name is used by any agent in the list, False otherwise.
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
     * @return The number of Curating Agents
     * @dev Currently this returns the hardcoded BILDData.R or the number of Nominated Agents, whichever is lower.
     */
    function calculateR()
        public
        view
        returns(uint256)
    {
        address agent = highestAgent;
        uint256 _R = 0;
        while (agent != NULL_ADDRESS){
            _R += 1;
            if (_R >= R) break;
            agent = agents[agent].lowerAgent;
        }
        return _R;
    }

    /**
     * @notice Calculates the aggregated stakes for the R top rated agents.
     * @param _R The number of agents to aggregate stakes for, starting by the top rated agent.
     * @return The aggregated stakes fot the R top ranked agents.
     */
    function totalStakes(uint256 _R)
        public
        view
        returns(uint256)
    {
        uint256 _stakes = 0;
        address agent = highestAgent;
        for (uint256 agentIndex = 0; agentIndex < _R; agentIndex += 1){
            require(
                agent != NULL_ADDRESS,
                "R is greater than the number of agents."
            );
            _stakes += aggregateAgentStakes(agent);
            agent = agents[agent].lowerAgent;
        }
        return _stakes;
    }

    /**
     * @notice Calculates the proportion of a payout for a stake between many.
     * @param _payout The payout to distribute.
     * @param _totalStakes The aggregated stakes.
     * @param _stake The stake that the payout is for. 
     * @return The payout to the stakeholder in BILD wei
     */
    function stakePayout(uint256 _payout, uint256 _totalStakes, uint256 _stake)
        public
        pure
        returns(uint256)
    {
        // The maximum stake is 10**28 (BILD total supply).
        // maxInt256 ~= 10**76
        // The operation below is safe up to agent payouts of 10**24 MIX tokens
        return (_payout.mul(_stake)).div(_totalStakes);
    }

    /**
     * @notice Distributes a fee pool to an agent and its stakeholders.
     * @param _totalPayout The fees due for _agent.
     * @param _agent An agent with fees due.
     * @return The aggregation of fees paid, which can be lower than _agentPayout due to rounding.
     */
    function payFeesForAgent(uint256 _totalPayout, address _agent)
        internal
        returns(uint256)
    {
        require(
            MIXRContract != NULL_ADDRESS, 
            "The address for the MIXR Contract needs to be set first."
        );
        // Pay to the agent first
        uint256 _agentPayout = _totalPayout / 2;
        uint256 stakeholdersPayout = _totalPayout / 2;
        uint256 paidFees = _agentPayout;
        IERC20(MIXRContract).approve(address(this), _agentPayout);
        IERC20(MIXRContract).transferFrom(address(this), _agent, _agentPayout);

        // Pay to the stakeholders
        Stake[] memory agentStakes = stakesByAgent[_agent];
        uint256 aggregatedAgentStakes = aggregateAgentStakes(_agent);
        for (uint256 stakeIndex = 0; stakeIndex < agentStakes.length; stakeIndex += 1)
        {
            Stake memory stake = agentStakes[stakeIndex];
            uint256 payout = stakePayout(
                stakeholdersPayout,
                aggregatedAgentStakes,
                stake.value
            );
            // Send the fee in MIX to the stakeholder account
            paidFees += payout; // Cannot be bigger than _agentPayout
            // TODO: Refactor as a withdrawal
            IERC20(MIXRContract).transfer(stake.stakeholder, payout);
        }
        return paidFees;
    }

    /**
     * @notice Pays accumulated fees to R top rated agents and their stakeholders.
     * @return The aggregation of fees paid, which can be lower than the MIX balance of the BILD contract due to rounding.
     */
    function payoutFees()
        internal
        returns(uint256)
    {
        uint256 _R = calculateR(); // This must ensure a valid R at or below the total number f agents is returned.
        uint256 _totalStakes = totalStakes(_R);
        uint256 paidFees = 0;
        uint256 totalPayout = IERC20(MIXRContract).balanceOf(address(this));
        address currentAgent = highestAgent;
        for (uint256 agentIndex = 0; agentIndex < _R; agentIndex += 1){
            uint256 agentPayout = stakePayout(
                totalPayout,
                _totalStakes,
                aggregateAgentStakes(currentAgent)
            );
            paidFees += payFeesForAgent(agentPayout, currentAgent); // paidFees cannot be bigger than MIXR.totalSupply()
            currentAgent = agents[currentAgent].lowerAgent;
        }
        return paidFees;
    }
}