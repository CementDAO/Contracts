const BILD = artifacts.require('./BILD.sol');
const Whitelist = artifacts.require('./Whitelist.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    let whitelist;
    const bildDecimals = 18;
    const owner = accounts[0];
    const distributor = accounts[1];
    const governor = accounts[2];
    const stakeholder1 = accounts[3];
    const stakeholder2 = accounts[4];
    const stakeholder3 = accounts[5];
    const agent1 = accounts[6];
    const agent2 = accounts[7];
    const agent3 = accounts[8];
    let oneBILDToken;
    let twoBILDTokens;
    let manyBILDTokens;

    before(async () => {
        bild = await BILD.deployed();
        whitelist = await Whitelist.deployed();
        oneBILDToken = tokenNumber(bildDecimals, 1);
        twoBILDTokens = tokenNumber(bildDecimals, 2);
        manyBILDTokens = tokenNumber(bildDecimals, 100);
    });

    /*
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

    describe('aggregateAgentStakes', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
            await whitelist.addStakeholder(stakeholder1, {
                from: governor,
            });
            await whitelist.addStakeholder(stakeholder2, {
                from: governor,
            });
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );

            await bild.transfer(
                stakeholder2,
                manyBILDTokens,
                { from: distributor },
            );
        });
        itShouldThrow(
            'aggregateAgentStakes fails if passed a non nominated agent.',
            async () => {
                await bild.aggregateAgentStakes(
                    agent3,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Agent not found.',
        );
        it('aggregateAgentStakes returns aggregated of one stake.', async () => {
            await bild.nominateAgent(
                agent1,
                oneBILDToken,
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = new BigNumber(
                await bild.aggregateAgentStakes(
                    agent1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            aggregatedStakes.should.be.bignumber.equal(oneBILDToken);
        });
        it('aggregateAgentStakes returns aggregated of two stakes.', async () => {
            await bild.nominateAgent(
                agent1,
                oneBILDToken,
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder2,
                },
            );

            const aggregatedStakes = new BigNumber(
                await bild.aggregateAgentStakes(
                    agent1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            aggregatedStakes.should.be.bignumber.equal(twoBILDTokens);
        });
        it('aggregateAgentStakes returns aggregated for right agent.', async () => {
            await bild.nominateAgent(
                agent1,
                oneBILDToken,
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder2,
                },
            );

            await bild.nominateAgent(
                agent2,
                oneBILDToken,
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = new BigNumber(
                await bild.aggregateAgentStakes(
                    agent2,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            aggregatedStakes.should.be.bignumber.equal(oneBILDToken);
        });
    });

    /**
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

    describe('aggregateHolderStakes', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
            await whitelist.addStakeholder(stakeholder1, {
                from: governor,
            });
            await whitelist.addStakeholder(stakeholder2, {
                from: governor,
            });
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );

            await bild.transfer(
                stakeholder2,
                manyBILDTokens,
                { from: distributor },
            );
        });
        it('aggregateHolderStakes returns zero for stakeholders without stakes.', async () => {
            const aggregatedStakes = new BigNumber(
                await bild.aggregateHolderStakes(
                    stakeholder3,
                    {
                        from: stakeholder3,
                    },
                ),
            );
            aggregatedStakes.should.be.bignumber.equal(0);
        });
        it('aggregateHolderStakes returns aggregated of one stake.', async () => {
            await bild.nominateAgent(
                agent1,
                oneBILDToken,
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = new BigNumber(
                await bild.aggregateHolderStakes(
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            aggregatedStakes.should.be.bignumber.equal(oneBILDToken);
        });
        it('aggregateHolderStakes returns aggregated of two stakes.', async () => {
            await bild.nominateAgent(
                agent1,
                oneBILDToken,
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = new BigNumber(
                await bild.aggregateHolderStakes(
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            aggregatedStakes.should.be.bignumber.equal(twoBILDTokens);
        });
        it('aggregateHolderStakes returns aggregated for right stakeholder.', async () => {
            await bild.nominateAgent(
                agent1,
                oneBILDToken,
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder2,
                },
            );

            const aggregatedStakes = new BigNumber(
                await bild.aggregateHolderStakes(
                    stakeholder2,
                    {
                        from: stakeholder2,
                    },
                ),
            );
            aggregatedStakes.should.be.bignumber.equal(oneBILDToken);
        });
    });
});
