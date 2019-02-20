const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('./test/SampleOtherERC20.sol');
const SamplePlainERC20 = artifacts.require('./test/SamplePlainERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('MIXR governance', (accounts) => {
    let mixr;
    let fixidityLibMock;
    let someERC20;
    let someOtherERC20;
    let somePlainERC20;
    let someERC721;
    let someERC20Decimals;
    let someOtherERC20Decimals;
    let somePlainERC20Decimals;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        someERC721 = await SampleERC721.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
        somePlainERC20 = await SamplePlainERC20.deployed();
    });

    describe('onlyGovernor modifier', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
        });
        itShouldThrow(
            'a non-governor can\'t set the account for fees.',
            async () => {
                await mixr.addGovernor(accounts[3], {
                    from: user,
                });
            },
            'revert',
        );

        it('a governor can set the stakeholder fee holding account.', async () => {
        });
    });

    describe('whitelist management', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
        });
        itShouldThrow(
            'only owner can add a governor',
            async () => {
                await mixr.addGovernor(accounts[3], {
                    from: user,
                });
            },
            'revert',
        );

        it('isGovernor returns true with a governor account.', async () => {
        });

        it('isGovernor returns false with a non-governor account.', async () => {
        });

        it('allows the owner to add a governor.', async () => {
        });

        it('allows the owner to remove a governor.', async () => {
        });

        it('allows the contract to add and then remove an additional governor', async () => {
            assert.equal(false, await mixr.isGovernor(accounts[3]));
            await mixr.addGovernor(accounts[3], {
                from: owner,
            });
            assert.equal(true, await mixr.isGovernor(accounts[3]));
            await mixr.removeGovernor(accounts[3], {
                from: owner,
            });
            assert.equal(false, await mixr.isGovernor(accounts[3]));
        });
    });


    describe('setting the stakeholder fee holding account', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
        });
        itShouldThrow(
            'only valid addresses are allowed as the stakeholder fee holding account.',
            async () => {
                await mixr.addGovernor(accounts[3], {
                    from: user,
                });
            },
            'revert',
        );

        it('a governor can set the stakeholder fee holding account.', async () => {
        });
    });

    describe('token registering', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
        });

        itShouldThrow(
            'forbids non-governors to approve a valid token',
            async () => {
                await mixr.registerToken(someERC20.address, {
                    from: user,
                });
            },
            'Message sender isn\'t part of the governance whitelist.',
        );

        itShouldThrow(
            'forbids approving a non-valid token',
            async () => {
                await mixr.registerToken(someERC721.address, {
                    from: governor,
                });
            },
            'revert',
        );

        itShouldThrow(
            'forbids approving a non-contract address',
            async () => {
                await mixr.registerToken(user, {
                    from: governor,
                });
            },
            'The specified address doesn\'t look like a deployed contract.',
        );

        itShouldThrow(
            'forbids approving an approved token',
            async () => {
                await mixr.registerToken(someERC20.address, {
                    from: governor,
                });
                await mixr.registerToken(someERC20.address, {
                    from: governor,
                });
            },
            'Token is already registered!',
        );

        it('allows a governor to approve an ERC20Detailed token', async () => {
            await mixr.registerToken(someERC20.address, {
                from: governor,
            });
        });

        it('allows a governor to approve an ERC20 token', async () => {
            await mixr.registerTokenWithDecimals(somePlainERC20.address, 18, {
                from: governor,
            });
        });

        itShouldThrow(
            'forbids approving an ERC20 token without decimals',
            async () => {
                await mixr.registerToken(somePlainERC20.address, {
                    from: governor,
                });
            },
            'revert',
        );
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('proportion management', async () => {
        beforeEach(async () => {
            someERC20Decimals = 18;
            someOtherERC20Decimals = 18;
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            someERC20 = await SampleERC20.new(
                governor,
                tokenNumber(someERC20Decimals, 100),
                someERC20Decimals,
            );
            someOtherERC20 = await SampleOtherERC20.new(
                governor,
                tokenNumber(someOtherERC20Decimals, 100),
                someOtherERC20Decimals,
            );

            await mixr.registerToken(someERC20.address, {
                from: governor,
            });
            await mixr.registerToken(someOtherERC20.address, {
                from: governor,
            });
        });

        itShouldThrow('stops setting proportions with mismatched token and proportion arrays.', async () => {
            const tokensArray = [someERC20.address];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        }, 'The number of target proportions supplied doesn\'t match the number of token addresses supplied.');

        itShouldThrow(
            'stops setting proportions for only a subset of registered tokens.',
            async () => {
                const tokensArray = [someERC20.address];
                const proportionArray = [
                    new BigNumber(await fixidityLibMock.newFixed(1)).toString(10),
                ];
                await mixr.setTokensTargetProportion(
                    tokensArray,
                    proportionArray,
                    {
                        from: governor,
                    },
                );
            },
            'Proportions must be given for all registered tokens.',
        );

        itShouldThrow(
            'stops setting proportions to non registered tokens',
            async () => {
                const tokensArray = [
                    someERC721.address,
                    someERC20.address,
                ];
                const proportionArray = [
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                ];
                await mixr.setTokensTargetProportion(
                    tokensArray,
                    proportionArray,
                    {
                        from: governor,
                    },
                );
            },
            'Proportions must be given for all registered tokens.',
        );


        itShouldThrow('forbids to set token target proportions that outside the [0,1] range.', async () => {
            const tokensArray = [
                someERC20.address,
                someOtherERC20.address,
            ];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixed(1)).multipliedBy(2).toString(10),
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        }, 'Target proportion not in the [0,1] range.');

        itShouldThrow('forbids to send invalid total proportions', async () => {
            const tokensArray = [
                someERC20.address,
                someOtherERC20.address,
            ];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(4).toString(10),
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        }, 'The target proportions supplied must add up to 1.');

        itShouldThrow(
            'stops non-governors from setting target proportions.',
            async () => {
                const tokensArray = [
                    someERC20.address,
                    someOtherERC20.address,
                ];
                const proportionArray = [
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                ];
                await mixr.setTokensTargetProportion(
                    tokensArray,
                    proportionArray,
                    {
                        from: user,
                    },
                );
            },
            'Message sender isn\'t part of the governance whitelist.',
        );

        it('allows a governor to set target proportions', async () => {
            const tokensArray = [
                someERC20.address,
                someOtherERC20.address,
            ];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        });
    });
});
