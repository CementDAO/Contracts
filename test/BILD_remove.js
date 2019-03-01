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
            await bild.nominateAgent(
                agent1,
                minimumStake,
                {
                    from: stakeholder1,
                },
            );
        });
        /*
        * Test stakeholder1: removeStake(agent1, 1 token) fails - "Agent not found."
        * Execute stakeholder1: nominateAgent(agent1, 1 token)
        * Test stakeholder2: removeStake(agent1, 1 tokens) fails - "No stakes were found for the agent."
        * Execute stakeholder1: nominateAgent(agent1, 1 token)
        * Test stakeholder1: removeStake(agent1, 2 tokens) fails - "Attempted to reduce a stake by more than its value."
        * Execute stakeholder1: nominateAgent(agent1, 2 tokens)
        * Test stakeholder1: removeStake(agent1, 1 token) executes then findStakeValue(agent1, stakeholder1) returns one token
        * Execute:
        *     stakeholder1: nominateAgent(agent1, 4 tokens)
        *     stakeholder1: removeStake(agent1, 1 token)
        *     stakeholder1: removeStake(agent1, 1 token)
        * Test findStakeValue(agent1, stakeholder1) returns two tokens
        * Execute:
        *     stakeholder1: nominateAgent(agent1, 3 tokens)
        *     stakeholder2: createStake(agent1, 5 tokens)
        *     stakeholder1: removeStake(agent1, 1 token)
        *     stakeholder2: removeStake(agent1, 1 token)
        * Test findStakeValue(agent1, stakeholder1) returns two tokens
        * Test findStakeValue(agent1, stakeholder2) returns four tokens
        * Execute:
        *     stakeholder1: nominateAgent(agent1, 3 tokens)
        *     stakeholder1: nominateAgent(agent2, 5 tokens)
        *     stakeholder1: removeStake(agent1, 1 token)
        *     stakeholder1: removeStake(agent2, 1 token)
        * Test findStakeValue(agent1, stakeholder1) returns two tokens
        * Test findStakeValue(agent2, stakeholder1) returns four tokens
        * Execute:
        *     stakeholder1: nominateAgent(agent1, 1 token)
        *     check findStakeValue(agent1, stakeholder1) returns 1 token
        *     stakeholder1: removeStake(agent1, 1 wei)
        *     Test findStakeValue(agent1, stakeholder1) fails - "Agent not found."
        */
        itShouldThrow(
            'removeStake fails if passed a non nominated agent.',
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
        itShouldThrow(
            'removeStake fails for agent with no stakes.',
            async () => {
                await bild.removeStake(
                    agent1,
                    oneBILDToken,
                    {
                        from: stakeholder2,
                    },
                );
            },
            'No stakes were found for the agent.',
        );
        itShouldThrow(
            'removeStake fails for amounts larger than existing stakes.',
            async () => {
                await bild.removeStake(
                    agent1,
                    twoBILDTokens,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Attempted to reduce a stake by more than its value.',
        );
        it('removeStake with 1 BILD token executes', async () => {
            await bild.createStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );
            
            await bild.removeStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            const createdStake = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            createdStake.should.be.bignumber.equal(oneBILDToken);
        });
        it('removeStake with several BILD token executes', async () => {
            await bild.createStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(4),
                {
                    from: stakeholder1,
                },
            );
            
            await bild.removeStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(2),
                {
                    from: stakeholder1,
                },
            );

            const createdStake = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            createdStake.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(3));
        });
        it('removeStake works in a succession', async () => {
            await bild.createStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(4),
                {
                    from: stakeholder1,
                },
            );

            await bild.removeStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            await bild.removeStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            const createdStake = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            createdStake.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(3));
        });
        it('removeStake impacts the right stakeholder', async () => {
            await bild.createStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(5),
                {
                    from: stakeholder1,
                },
            );

            await bild.createStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(4),
                {
                    from: stakeholder2,
                },
            );

            await bild.removeStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            await bild.removeStake(
                agent1,
                twoBILDTokens,
                {
                    from: stakeholder2,
                },
            );

            const createdStake1 = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            const createdStake2 = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder2,
                    {
                        from: stakeholder2,
                    },
                ),
            );
            createdStake1.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(5));
            createdStake2.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(2));
        });
        it('removeStake impacts the right agent', async () => {
            await bild.createStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(5),
                {
                    from: stakeholder1,
                },
            );

            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                {
                    from: stakeholder1,
                },
            );

            await bild.removeStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            await bild.removeStake(
                agent2,
                twoBILDTokens,
                {
                    from: stakeholder1,
                },
            );

            const createdStake1 = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            const createdStake2 = new BigNumber(
                await bild.findStakeValue(
                    agent2,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            );
            createdStake1.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(5));
            createdStake2.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(2));
        });
        itShouldThrow(
            'removeStake revokes nominations for agents with aggregated stakes under minimum stake.',
            async () => {
                await bild.removeStake(
                    agent1,
                    1,
                    {
                        from: stakeholder1,
                    },
                );
                await bild.findStakeValue(
                    agent1,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                );
            },
            'Agent not found.',
        );
    });
    /*
    * Execute:
    * stakeholder1: nominateAgent(agent1, 15 tokens)
    * stakeholder2: nominateAgent(agent2, 25 tokens)
    * stakeholder1: createStake(agent2, 35 tokens)
    * stakeholder2: createStake(agent1, 45 tokens)
    * stakeholder1: removeStake(agent1, 1 token)
    * stakeholder1: removeStake(agent2, 2 token)
    * stakeholder2: removeStake(agent1, 3 token)
    * stakeholder2: removeStake(agent2, 4 token)
    * Test findStakeValue(agent1, stakeholder1) returns 14 token.
    * Test findStakeValue(agent1, stakeholder2) returns 43 token.
    * Test findStakeValue(agent2, stakeholder1) returns 32 token.
    * Test findStakeValue(agent1, stakeholder2) returns 21 token.
    */
    describe('findStake*', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);

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

            await bild.nominateAgent(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(15),
                {
                    from: stakeholder1,
                },
            );

            await bild.nominateAgent(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(25),
                {
                    from: stakeholder2,
                },
            );

            await bild.createStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(35),
                {
                    from: stakeholder1,
                },
            );
            
            await bild.createStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(45),
                {
                    from: stakeholder2,
                },
            );

            await bild.removeStake(
                agent1,
                oneBILDToken,
                {
                    from: stakeholder1,
                },
            );

            await bild.removeStake(
                agent1,
                new BigNumber(oneBILDToken).multipliedBy(2),
                {
                    from: stakeholder2,
                },
            );

            await bild.removeStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(3),
                {
                    from: stakeholder1,
                },
            );

            await bild.removeStake(
                agent2,
                new BigNumber(oneBILDToken).multipliedBy(4),
                {
                    from: stakeholder2,
                },
            );
        });
        it('aggregateHolderStakes after removeStake for first agent and first stakeholder.', async () => {
            const createdStakeValue = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            ); // 15 - 1
            createdStakeValue.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(14));
        });
        it('aggregateHolderStakes after removeStake for first agent and second stakeholder.', async () => {
            const createdStakeValue = new BigNumber(
                await bild.findStakeValue(
                    agent1,
                    stakeholder2,
                    {
                        from: stakeholder2,
                    },
                ),
            ); // 45 - 2
            createdStakeValue.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(43));
        });
        it('aggregateHolderStakes after removeStake for second agent and first stakeholder.', async () => {
            const createdStakeValue = new BigNumber(
                await bild.findStakeValue(
                    agent2,
                    stakeholder1,
                    {
                        from: stakeholder1,
                    },
                ),
            ); // 35 - 3
            createdStakeValue.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(32));
        });
        it('aggregateHolderStakes after removeStake for second agent and second stakeholder.', async () => {
            const createdStakeValue = new BigNumber(
                await bild.findStakeValue(
                    agent2,
                    stakeholder2,
                    {
                        from: stakeholder2,
                    },
                ),
            ); // 25 - 4
            createdStakeValue.should.be.bignumber.equal(new BigNumber(oneBILDToken).multipliedBy(21));
        });
    });
});
