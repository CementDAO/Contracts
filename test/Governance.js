const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('./test/SampleOtherERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow } = require('./utils');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('MIXR governance', (accounts) => {
    let mixr;
    let fixidityLibMock;
    let someERC20;
    let someOtherERC20;
    let someERC721;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        someERC721 = await SampleERC721.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
    });

    describe('whitelist management', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
        });
        itShouldThrow(
            'forbids an arbitrary user to add a governor',
            async () => {
                await mixr.addGovernor(accounts[3], {
                    from: user,
                });
            },
            'revert',
        );

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

    describe('token approval', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
        });

        it('allows a governor to approve a valid token', async () => {
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
        });

        itShouldThrow(
            'forbids non-governors to approve a valid token',
            async () => {
                await mixr.approveToken(someERC20.address, {
                    from: user,
                });
            },
            'Message sender isn\'t part of the governance whitelist.',
        );

        itShouldThrow(
            'forbids approving a non-valid token',
            async () => {
                await mixr.approveToken(someERC721.address, {
                    from: governor,
                });
            },
            'revert',
        );

        itShouldThrow(
            'forbids approving a non-contract address',
            async () => {
                await mixr.approveToken(user, {
                    from: governor,
                });
            },
            'The specified address doesn\'t look like a deployed contract.',
        );
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('proportion management', async () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });

            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            await mixr.approveToken(someOtherERC20.address, {
                from: governor,
            });
        });

        itShouldThrow(
            'forbids to perform for non-accepted tokens',
            async () => {
                const tokensArray = [someERC721.address];
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
            'The given token isn\'t listed as accepted.',
        );

        itShouldThrow(
            'forbids to perform for non-governors',
            async () => {
                const tokensArray = [someERC20.address];
                const proportionArray = [
                    new BigNumber(await fixidityLibMock.newFixed(1)).toString(10),
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

        it('allows a governor to set a proportion for an approved token', async () => {
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
        });

        it('allows to send valid information', async () => {
            const tokensArray = [someERC20.address, someOtherERC20.address];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        });

        itShouldThrow('forbids to send invalid number of elements', async () => {
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
        }, 'Invalid number of elements!');

        itShouldThrow('forbids to send invalid token', async () => {
            const tokensArray = [someERC20.address, someERC721.address];
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
        }, 'The given token isn\'t listed as accepted.');
    });
});
