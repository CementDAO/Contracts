const BILD = artifacts.require('./BILD.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    const bildDecimals = 18;
    const governor = accounts[0]
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

    describe('createStake', () => {
        beforeEach(async () => {
            bild = await BILD.new(
                governor,
                bildSupply,
                bildDecimals,
            );
        });
        /*
         * Test createStake(_agent, 1) fails with no BILD - "Attempted stake larger than BILD balance."
         * Test createStake(_agent, 2) fails with 1 BILD wei - "Attempted stake larger than BILD balance."
         * Test createStake(_agent, 1) fails with 1 BILD wei - "Minimum stake to nominate an agent not reached."
         * Test createStake(_agent, 1 token) with 1 BILD token executes and findStakeIndex(_agent, _stakeholder) returns 0.
         */
        itShouldThrow(
            'createStake fails with no BILD balance',
            async () => {
                await bild.createStake(
                    agent1,
                    1,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Attempted stake larger than BILD balance.',
        );
        itShouldThrow(
            'createStake fails with stake larger than balance',
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
        });
    });

    describe('findStake*', () => {
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
                stakeholder1,
                manyBILDTokens,
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
                twoBILDTokens,
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
        });
        /*
         * Test findStakeIndex(agent3, stakeholder1) fails - "Agent not found."
         * Execute:
         * stakeholder1: createStake(agent1, 1 token)
         * stakeholder2: createStake(agent1, 2 token)
         * stakeholder1: createStake(agent2, 1 token)
         * Test findStakeIndex(agent1, stakeholder1) returns 0.
         * Test findStakeIndex(agent1, stakeholder2) returns 1.
         * Test findStakeIndex(agent2, stakeholder1) returns 0.
         * Test findStakeIndex(agent1, stakeholder3) returns 2.
         * Test findStakeValue(agent1, stakeholder1) returns 1 token.
         * Test findStakeValue(agent2, stakeholder1) returns 2 token.
         */
        itShouldThrow(
            'findStakeIndex fails if passed a non nominated agent.',
            async () => {
                await bild.findStakeIndex(
                    agent3,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Agent not found.',
        );
        it('findStakeIndex returns stake index for first agent and first stakeholder.', async () => {
            const createdStake = await bild.findStakeIndex(
                agent1,
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            createdStake.should.be.bignumber.equal(0);
        });
        it('findStakeIndex returns stake index for first agent and second stakeholder.', async () => {
            const createdStake = await bild.findStakeIndex(
                agent1,
                stakeholder2,
                {
                    from: stakeholder2,
                },
            );
            createdStake.should.be.bignumber.equal(1);
        });
        it('findStakeIndex returns stake index for second agent and first stakeholder.', async () => {
            const createdStake = await bild.findStakeIndex(
                agent2,
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            createdStake.should.be.bignumber.equal(0);
        });
        it('findStakeIndex returns stake array length for stakeholders without stakes.', async () => {
            const createdStake = await bild.findStakeIndex(
                agent1,
                stakeholder3,
                {
                    from: stakeholder1,
                },
            );
            createdStake.should.be.bignumber.equal(2);
        });
        itShouldThrow(
            'findStakeValue fails if passed a non nominated agent.',
            async () => {
                await bild.findStakeIndex(
                    agent3,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Agent not found.',
        );
        it('findStakeValue returns stake value for first agent and first stakeholder.', async () => {
            const createdStake = await bild.findStakeIndex(
                agent1,
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            createdStake.should.be.bignumber.equal(oneBILDToken);
        });
        it('findStakeValue returns stake index for second agent and first stakeholder.', async () => {
            const createdStake = await bild.findStakeIndex(
                agent2,
                stakeholder1,
                {
                    from: stakeholder1,
                },
            );
            createdStake.should.be.bignumber.equal(twoBILDTokens);
        });
    });
});
