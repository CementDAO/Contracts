const BILD = artifacts.require('./BILD.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    const bildDecimals = 18;
    const distributor = accounts[1];
    const stakeholder1 = accounts[2];
    // const stakeholder2 = accounts[3];
    // const stakeholder3 = accounts[4];
    const agent1 = accounts[5];
    const agent2 = accounts[6];
    const agent3 = accounts[7];
    let oneBILDToken;
    // let twoBILDTokens;
    let manyBILDTokens;
    // let minimumStake;
    // let NO_STAKES;

    before(async () => {
        bild = await BILD.deployed();
        oneBILDToken = tokenNumber(bildDecimals, 1);
        // twoBILDTokens = tokenNumber(bildDecimals, 2);
        manyBILDTokens = tokenNumber(bildDecimals, 100);
        // minimumStake = oneBILDToken;
        // NO_STAKES = new BigNumber(115792089237316195423570985008687907853269984665640564039457584007913129639935);
    });

    describe('sortAgent on nominateAgent', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );
        });
        it('First agent to be nominated becomes highestAgent ranked.', async () => {
            const highestAgent = await bild.getHighestAgent();
            assert(highestAgent === agent1);
        });
        it('highestAgent agent can be retrieved by rank.', async () => {
            const agent = await bild.agentAtRank(0);
            assert(agent === agent1);
        });
        it('First agent to be nominated becomes lowestAgent ranked.', async () => {
            const lowestAgent = await bild.getLowestAgent();
            assert(lowestAgent === agent1);
        });
        it('Second agent to be nominated becomes highestAgent ranked.', async () => {
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            assert(highestAgent === agent2);
            assert(lowestAgent === agent1);
        });
        it('lowestAgent agent can be retrieved by rank.', async () => {
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            const agent = await bild.agentAtRank(1);
            assert(agent === agent1);
        });
        it('Second agent to be nominated becomes lowestAgent ranked.', async () => {
            await bild.nominateAgent(
                agent2,
                oneBILDToken,
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            assert(highestAgent === agent1);
            assert(lowestAgent === agent2);
        });
        it('Nominating agents with decreasing stakes.', async () => {
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(2),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                oneBILDToken,
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent1);
            assert(lowestAgent === agent3);
            assert(rank0 === agent1);
            assert(rank1 === agent2);
            assert(rank2 === agent3);
        });
        it('Nominating agents with increasing stakes.', async () => {
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(5),
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
            const highestAgent = await bild.getHighestAgent();
            const medium = await bild.agentAtRank(1);
            const lowestAgent = await bild.getLowestAgent();
            assert(highestAgent === agent3);
            assert(medium === agent2);
            assert(lowestAgent === agent1);
        });
    });

    describe('rankAt', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(6),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(9),
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
        });
        it('agentAtRank(0) returns highestAgent.', async () => {
            const result = await bild.agentAtRank(0);
            assert(result === agent3);
        });
        it('agentAtRank(1) returns middle.', async () => {
            const result = await bild.agentAtRank(1);
            assert(result === agent2);
        });
        it('agentAtRank(2) returns lowestAgent', async () => {
            const result = await bild.agentAtRank(2);
            assert(result === agent1);
        });
        it('agentAtRankFrom(middle, 1) returns lowestAgent', async () => {
            const result = await bild.agentAtRankFrom(agent2, 1);
            assert(result === agent1);
        });
        itShouldThrow(
            'agentAtRank fails with rank larger than list',
            async () => {
                await bild.agentAtRank(
                    3,
                );
            },
            'Not enough agents in the list.',
        );
        itShouldThrow(
            'agentAtRankFrom fails with unranked agents',
            async () => {
                await bild.detachAgent(
                    agent1,
                );
                await bild.agentAtRankFrom(
                    agent1,
                    0,
                );
            },
            'The agent is not in the agents ranking.',
        );
    });


    describe('higherAgent', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(6),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(9),
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
        });
        it('higherAgent(highestAgent) returns 0.', async () => {
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);

            const result = new BigNumber(
                await bild.higherAgent(
                    agent3,
                ),
            );
            result.should.be.bignumber.equal(0);
        });
        it('higherAgent(1) returns highestAgent.', async () => {
            const result = await bild.higherAgent(
                agent2,
            );
            assert(result === agent3);
        });
        it('higherAgent(2) returns 1.', async () => {
            const result = await bild.higherAgent(
                agent2,
            );
            assert(result === agent3);
        });
        itShouldThrow(
            'higherAgent fails with unranked agents',
            async () => {
                await bild.detachAgent(
                    agent1,
                );
                await bild.higherAgent(
                    agent1,
                );
            },
            'The agent is not in the agents ranking.',
        );
    });

    describe('removeStake', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(6),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(9),
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
        });
        it('Removing a stake doesn\'t always change ranks.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            let rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);

            await bild.removeStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(1),
                {
                    from: stakeholder1,
                },
            );
            highestAgent = await bild.getHighestAgent();
            lowestAgent = await bild.getLowestAgent();
            rank0 = await bild.agentAtRank(0);
            rank1 = await bild.agentAtRank(1);
            rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);
        });
        it('Removing a stake decreases rank.', async () => {
            await bild.removeStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                {
                    from: stakeholder1,
                },
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent2);
            assert(rank0 === agent3);
            assert(rank1 === agent1);
            assert(rank2 === agent2);
        });
    });

    describe('revokeNomination', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(6),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(9),
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
        });
        it('Revoking nomination of lowestAgent.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            let rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);

            await bild.removeStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                {
                    from: stakeholder1,
                },
            );
            highestAgent = await bild.getHighestAgent();
            lowestAgent = await bild.getLowestAgent();
            rank0 = await bild.agentAtRank(0);
            rank1 = await bild.agentAtRank(1);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent2);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
        });
        it('Revoking nomination of 1.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            let rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);

            await bild.removeStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(6),
                {
                    from: stakeholder1,
                },
            );
            highestAgent = await bild.getHighestAgent();
            lowestAgent = await bild.getLowestAgent();
            rank0 = await bild.agentAtRank(0);
            rank1 = await bild.agentAtRank(1);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent1);
        });
        it('Revoking nomination of highestAgent.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            let rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);

            await bild.removeStake(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(9),
                {
                    from: stakeholder1,
                },
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
    });

    describe('sortAgent on createStake', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(6),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(9),
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
        });
        it('Creating a stake doesn\'t always change ranks.', async () => {
            let highestAgent = await bild.getHighestAgent();
            let lowestAgent = await bild.getLowestAgent();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            let rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);

            await bild.createStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(1),
                {
                    from: stakeholder1,
                },
            );
            highestAgent = await bild.getHighestAgent();
            lowestAgent = await bild.getLowestAgent();
            rank0 = await bild.agentAtRank(0);
            rank1 = await bild.agentAtRank(1);
            rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent3);
            assert(lowestAgent === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent2);
            assert(rank2 === agent1);
        });
        it('Creating a stake increases rank.', async () => {
            await bild.createStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                {
                    from: stakeholder1,
                },
            );
            const highestAgent = await bild.getHighestAgent();
            const lowestAgent = await bild.getLowestAgent();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highestAgent === agent2);
            assert(lowestAgent === agent1);
            assert(rank0 === agent2);
            assert(rank1 === agent3);
            assert(rank2 === agent1);
        });
    });

    describe('nameExists', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(2),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
        });
        it('Finds name at highestAgent rank.', async () => {
            const exists = await bild.nameExists('agent1');
            assert(exists === true);
        });
        it('Finds name at not highestAgent rank.', async () => {
            const exists = await bild.nameExists('agent2');
            assert(exists === true);
        });
        it('Doesn\'t find not existing names.', async () => {
            const exists = await bild.nameExists('agent3');
            assert(exists === false);
        });
    });
});
