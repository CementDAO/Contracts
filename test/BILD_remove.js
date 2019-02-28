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

    describe('revokeNomination', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);

            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
        });
        /*
         * Execute nominateAgent(agent, minimumStake)
         * Test revokeNomination(agent1) fails - "Too many stakes to revoke agent nomination."
         */
        itShouldThrow(
            'revokeNomination fails for non nominated agent.',
            async () => {
                await bild.revokeNomination(
                    agent1,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Agent not found.',
        );
        itShouldThrow(
            'revokeNomination fails for agent with aggregated stakes above the minimum stake.',
            async () => {
                await bild.nominateAgent(
                    agent1,
                    minimumStake,
                    {
                        from: stakeholder1,
                    },
                );
                
                await bild.revokeNomination(
                    agent1,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Too many stakes to revoke agent nomination.',
        );
    });

    describe('removeStake', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
        });
        /*
        * Test stakeholder1: removeStake(agent1, 1 token) fails - "No stakes were found for the agent."
        * Execute stakeholder1: createStake(agent1, 1 token)
        * Test stakeholder1: removeStake(agent1, 2 tokens) fails - "Attempted to reduce a stake by more than its value."
        * Execute stakeholder1: createStake(agent1, 1 token)
        * Test stakeholder1: removeStake(agent1, 1 token) executes then findStakeValue(agent1, stakeholder1) returns zero
        * Execute stakeholder1: createStake(agent1, 2 tokens)
        * Test stakeholder1: removeStake(agent1, 1 token) executes then findStakeValue(agent1, stakeholder1) returns one token
        * Execute:
        *     stakeholder1: createStake(agent1, 2 tokens)
        *     stakeholder2: createStake(agent1, 2 tokens)
        * Test stakeholder1: removeStake(agent1, 1 token) executes then findStakeValue(agent1, stakeholder2) returns two tokens
         */
        /* itShouldThrow(
            'removeStake fails for agent with no stakes.',
            async () => {
                await bild.removeStake(
                    agent1,
                    oneBILDToken,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'No stakes were found for the agent.',
        );
        itShouldThrow(
            'removeStake fails for amounts larger than existing stakes.',
            async () => {
                await bild.transfer(
                    stakeholder1,
                    oneBILDToken,
                    { from: governor },
                );
                
                await bild.createStake(
                    agent1,
                    twoBILDTokens,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Attempted stake larger than BILD balance.',
        );
        itShouldThrow(
            'createStake fails with stake under minimum stake.',
            async () => {
                await bild.transfer(
                    stakeholder1,
                    oneBILDToken,
                    { from: governor },
                );

                await bild.createStake(
                    agent1,
                    1,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Minimum stake to nominate an agent not reached.',
        );
        it('createStake with 1 BILD token executes', async () => {
            await bild.transfer(
                stakeholder1,
                oneBILDToken,
                { from: governor },
            );
            
            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            const createdStake = await bild.findStakeValue(
                agent1,
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            createdStake.should.be.bignumber.equal(oneBILDToken);
        });
        it('stakes with the same agent and stakeholder merge.', async () => {
            await bild.transfer(
                stakeholder1,
                twoBILDTokens,
                { from: governor },
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
                    from: stakeholder1,
                },
            );

            const createdStake = await bild.findStakeValue(
                agent1,
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            createdStake.should.be.bignumber.equal(twoBILDTokens);
        }); */
    });
});
