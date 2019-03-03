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
    const stakeholder2 = accounts[3];
    const stakeholder3 = accounts[4];
    const agent1 = accounts[5];
    const agent2 = accounts[6];
    const agent3 = accounts[7];
    let oneBILDToken;
    let twoBILDTokens;
    let manyBILDTokens;
    let minimumStake;
    let NO_STAKES;

    before(async () => {
        bild = await BILD.deployed();
        oneBILDToken = tokenNumber(bildDecimals, 1);
        twoBILDTokens = tokenNumber(bildDecimals, 2);
        manyBILDTokens = tokenNumber(bildDecimals, 100);
        minimumStake = oneBILDToken;
        NO_STAKES = new BigNumber(115792089237316195423570985008687907853269984665640564039457584007913129639935);
    });

    describe('insert on nominateAgent', () => {
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
        it('First agent to be nominated becomes highest ranked.', async () => {
            const highest = await bild.getHighest();
            assert(highest === agent1);
        });
        it('Highest agent can be retrieved by rank.', async () => {
            const agent = await bild.agentAtRank(0);
            assert(agent === agent1);
        });
        it('First agent to be nominated becomes lowest ranked.', async () => {
            const lowest = await bild.getLowest();
            assert(lowest === agent1);
        });
        it('Second agent to be nominated becomes highest ranked.', async () => {
            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            const highest = await bild.getHighest();
            const lowest = await bild.getLowest();
            assert(highest === agent2);
            assert(lowest === agent1);
        });
        /* it('Retrieving an agent by rank with a non existing rank returns 0.', async () => {
            const agent = await bild.agentAtRank(1);
            assert(agent === 0);
        }); */
        it('Lowest agent can be retrieved by rank.', async () => {
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
        it('Second agent to be nominated becomes lowest ranked.', async () => {
            await bild.nominateAgent(
                agent2,
                oneBILDToken,
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            const highest = await bild.getHighest();
            const lowest = await bild.getLowest();
            assert(highest === agent1);
            assert(lowest === agent2);
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
            const highest = await bild.getHighest();
            const lowest = await bild.getLowest();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highest === agent1);
            assert(lowest === agent3);
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
            const highest = await bild.getHighest();
            const medium = await bild.agentAtRank(1);
            const lowest = await bild.getLowest();
            assert(highest === agent3);
            assert(medium === agent2);
            assert(lowest === agent1);
        });
    });

    describe('insert on removeStake', () => {
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
            let highest = await bild.getHighest();
            let lowest = await bild.getLowest();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            let rank2 = await bild.agentAtRank(2);
            assert(highest === agent3);
            assert(lowest === agent1);
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
            highest = await bild.getHighest();
            lowest = await bild.getLowest();
            rank0 = await bild.agentAtRank(0);
            rank1 = await bild.agentAtRank(1);
            rank2 = await bild.agentAtRank(2);
            assert(highest === agent3);
            assert(lowest === agent1);
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
            const highest = await bild.getHighest();
            const lowest = await bild.getLowest();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highest === agent3);
            assert(lowest === agent2);
            assert(rank0 === agent3);
            assert(rank1 === agent1);
            assert(rank2 === agent2);
        });
        /* it('Revoking a nomination preserves list integrity.', async () => {
            await bild.removeStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(6),
                {
                    from: stakeholder1,
                },
            );
            const highest = await bild.getHighest();
            const lowest = await bild.getLowest();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            assert(highest === agent3);
            assert(lowest === agent1);
            assert(rank0 === agent3);
            assert(rank1 === agent1);
        }); */
    });

    /* describe('insert on createStake', () => {
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
            let highest = await bild.getHighest();
            let lowest = await bild.getLowest();
            let rank0 = await bild.agentAtRank(0);
            let rank1 = await bild.agentAtRank(1);
            let rank2 = await bild.agentAtRank(2);
            assert(highest === agent3);
            assert(lowest === agent1);
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
            highest = await bild.getHighest();
            lowest = await bild.getLowest();
            rank0 = await bild.agentAtRank(0);
            rank1 = await bild.agentAtRank(1);
            rank2 = await bild.agentAtRank(2);
            assert(highest === agent3);
            assert(lowest === agent1);
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
            const highest = await bild.getHighest();
            const lowest = await bild.getLowest();
            const rank0 = await bild.agentAtRank(0);
            const rank1 = await bild.agentAtRank(1);
            const rank2 = await bild.agentAtRank(2);
            assert(highest === agent2);
            assert(lowest === agent1);
            assert(rank0 === agent2);
            assert(rank1 === agent3);
            assert(rank2 === agent1);
        });
    }); */

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
        it('Finds name at highest rank.', async () => {
            const exists = await bild.nameExists('agent1');
            assert(exists === true);
        });
        it('Finds name at not highest rank.', async () => {
            const exists = await bild.nameExists('agent2');
            assert(exists === true);
        });
        it('Doesn\'t find not existing names.', async () => {
            const exists = await bild.nameExists('agent3');
            assert(exists === false);
        });
    });
});
