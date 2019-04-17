const BILDDataTest = artifacts.require('./BILDDataTest.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILDDataTest', (accounts) => {
    let bild;
    const distributor = accounts[1];
    const stakeholder1 = accounts[2];
    const agent1 = accounts[5];
    const agent2 = accounts[6];
    const agent3 = accounts[7];

    before(async () => {
        bild = await BILDDataTest.deployed();
    });

    describe('detachAgent 1', () => {
        beforeEach(async () => {
            bild = await BILDDataTest.new(distributor);

            await bild.testInsertAgent(
                agent1,
                {
                    from: stakeholder1,
                },
            );
        });
        it('detachAgent highestAgent.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            assert(highestAgent === agent1);
            assert(lowestAgent === agent1);
            assert(rank0 === agent1);

            await bild.testDetachAgent(
                agent1,
            );
            highestAgent = new BigNumber(await bild.getHighestAgent());
            highestAgent.should.be.bignumber.equal(0);
            lowestAgent = new BigNumber(await bild.getLowestAgent());
            lowestAgent.should.be.bignumber.equal(0);
        });
        itShouldThrow(
            'detachAgent fails with detached agents',
            async () => {
                await bild.testDetachAgent(
                    agent1,
                );
                await bild.testDetachAgent(
                    agent1,
                );
            },
            'The agent is already detached from the ranking.',
        );
    });


    describe('detachAgent 2', () => {
        beforeEach(async () => {
            bild = await BILDDataTest.new(distributor);

            await bild.testInsertAgent(
                agent2,
                {
                    from: stakeholder1,
                },
            );
            await bild.testInsertAgent(
                agent1,
                {
                    from: stakeholder1,
                },
            );
        });
        it('detachAgent highestAgent.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            let rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            assert(highestAgent === agent2);
            assert(lowestAgent === agent1);
            assert(rank0 === agent2);
            assert(rank1 === agent1);

            await bild.testDetachAgent(
                agent2,
            );
            highestAgent = await bild.getHighestAgent();
            lowestAgent = await bild.getLowestAgent();
            rank0 = await bild.agentAtRank(0);
            assert(highestAgent === agent1);
            assert(lowestAgent === agent1);
            assert(rank0 === agent1);
        });
        it('detachAgent lowestAgent.', async () => {
            await bild.testDetachAgent(
                agent1,
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            assert(highestAgent === agent2);
            assert(lowestAgent === agent2);
            assert(rank0 === agent2);
        });
        itShouldThrow(
            'detachAgent fails with detached agents',
            async () => {
                await bild.testDetachAgent(
                    agent1,
                );
                await bild.testDetachAgent(
                    agent1,
                );
            },
            'The agent is already detached from the ranking.',
        );
    });

    describe('detachAgent 3', () => {
        beforeEach(async () => {
            bild = await BILDDataTest.new(distributor);

            await bild.testInsertAgent(
                agent3,
                {
                    from: stakeholder1,
                },
            );
            await bild.testInsertAgent(
                agent2,
                {
                    from: stakeholder1,
                },
            );
            await bild.testInsertAgent(
                agent1,
                {
                    from: stakeholder1,
                },
            );
        });
        it('detachAgent highestAgent.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);

            await bild.testDetachAgent(
                agent3,
            );
            highestAgent = await bild.getHighestAgent();
            lowestAgent = await bild.getLowestAgent();
            rank0 = await bild.agentAtRank(0);
            rank1 = await bild.agentAtRank(1);
            assert(highestAgent === agent2);
            assert(lowestAgent === agent1);
            assert(rank0 === agent2);
            assert(rank1 === agent1);
        });
        it('detachAgent 1.', async () => {
            await bild.testDetachAgent(
                agent2,
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent1);
        });
        it('detachAgent lowestAgent.', async () => {
            await bild.testDetachAgent(
                agent1,
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent2);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
        });
        itShouldThrow(
            'detached agents don\'t link down to other agents',
            async () => {
                await bild.testDetachAgent(
                    agent3,
                );
                await bild.agentAtRankFrom(agent3, 1);
            },
            'The agent is not in the agents ranking.',
        );
        itShouldThrow(
            'detachAgent fails with detached agents',
            async () => {
                await bild.testDetachAgent(
                    agent1,
                );
                await bild.testDetachAgent(
                    agent1,
                );
            },
            'The agent is already detached from the ranking.',
        );
    });
});
