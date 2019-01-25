const MIXR = artifacts.require('./MIXR.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const { itShouldThrow } = require('./utils');

contract('MIXR governance', (accounts) => {
    let mixr;
    let someERC20;
    let someERC721;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        someERC20 = await SampleERC20.deployed();
        someERC721 = await SampleERC721.deployed();
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
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
        });

        itShouldThrow(
            'forbids to perform for non-accepted tokens',
            async () => {
                await mixr.setTokenTargetProportion(someERC721.address, 1, {
                    from: governor,
                });
            },
            'The given token isn\'t listed as accepted.',
        );

        itShouldThrow(
            'forbids to perform for non-governors',
            async () => {
                await mixr.setTokenTargetProportion(someERC20.address, 1, {
                    from: user,
                });
            },
            'Message sender isn\'t part of the governance whitelist.',
        );

        it('allows a governor to set a proportion for an approved token', async () => {
            await mixr.setTokenTargetProportion(someERC20.address, 1, {
                from: governor,
            });
        });
    });
});
