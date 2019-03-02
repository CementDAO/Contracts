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

    describe('sort', () => {
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
        it('Third agent to be nominated becomes rank 1.', async () => {
            await bild.nominateAgent(
                agent2,
                oneBILDToken,
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );
            await bild.nominateAgent(
                agent3,
                new BigNumber(oneBILDToken).multipliedBy(3),
                'agent3',
                'contact3',
                {
                    from: stakeholder1,
                },
            );
            const agent = await bild.agentAtRank(1);
            const highest = await bild.getHighest();
            const lowest = await bild.getLowest();
            assert(agent === agent3);
            assert(highest === agent1);
            assert(lowest === agent2);
        });
    });
});
