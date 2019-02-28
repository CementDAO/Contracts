const BILD = artifacts.require('./BILD.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    const bildDecimals = 18;
    const governor = accounts[0];
    const stakeholder1 = accounts[1];
    const stakeholder2 = accounts[2];
    const stakeholder3 = accounts[3];
    const agent1 = accounts[4];
    const agent2 = accounts[5];
    const agent3 = accounts[6];
    let oneBILDToken;
    let twoBILDTokens;
    let manyBILDTokens;
    let bildSupply;

    before(async () => {
        bild = await BILD.deployed();
        oneBILDToken = tokenNumber(bildDecimals, 1);
        twoBILDTokens = tokenNumber(bildDecimals, 2);
        manyBILDTokens = tokenNumber(bildDecimals, 100);
        bildSupply = tokenNumber(bildDecimals, 1000000000);
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
            bild = await BILD.new(
                governor,
                bildSupply,
                bildDecimals,
            );

            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: governor },
            );

            await bild.transfer(
                stakeholder2,
                manyBILDTokens,
                { from: governor },
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
            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = await bild.aggregateAgentStakes(
                agent1,
                {
                    from: stakeholder1,
                },
            );
            aggregatedStakes.should.be.bignumber.equal(oneBILDToken);
        });
        it('aggregateAgentStakes returns aggregated of two stakes.', async () => {
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

            const aggregatedStakes = await bild.aggregateAgentStakes(
                agent1,
                {
                    from: stakeholder1,
                },
            );
            aggregatedStakes.should.be.bignumber.equal(twoBILDTokens);
        });
        it('aggregateAgentStakes returns aggregated for right agent.', async () => {
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

            await bild.createStake(
                agent2,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = await bild.aggregateAgentStakes(
                agent2,
                {
                    from: stakeholder1,
                },
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
            bild = await BILD.new(
                governor,
                bildSupply,
                bildDecimals,
            );

            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: governor },
            );

            await bild.transfer(
                stakeholder2,
                manyBILDTokens,
                { from: governor },
            );
        });
        it('aggregateHolderStakes returns zero for stakeholders without stakes.', async () => {
            const aggregatedStakes = await bild.aggregateHolderStakes(
                stakeholder3,
                {
                    from: stakeholder3,
                },
            );
            aggregatedStakes.should.be.bignumber.equal(0);
        });
        it('aggregateHolderStakes returns aggregated of one stake.', async () => {
            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = await bild.aggregateHolderStakes(
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            aggregatedStakes.should.be.bignumber.equal(oneBILDToken);
        });
        it('aggregateHolderStakes returns aggregated of two stakes.', async () => {
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
                    from: stakeholder1,
                },
            );

            const aggregatedStakes = await bild.aggregateHolderStakes(
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            aggregatedStakes.should.be.bignumber.equal(twoBILDTokens);
        });
        it('aggregateHolderStakes returns aggregated for right stakeholder.', async () => {
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

            const aggregatedStakes = await bild.aggregateHolderStakes(
                stakeholder2,
                {
                    from: stakeholder2,
                },
            );
            aggregatedStakes.should.be.bignumber.equal(oneBILDToken);
        });
    });
});
