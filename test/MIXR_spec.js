const MIXR = artifacts.require('./MIXR.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const BigNumber = require('bignumber.js');
const { itShouldThrow } = require('./utils');

contract('MIXR', (accounts) => {
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

    const governanceFixture = () => {
        // All of our tests expect a governor to be added.
        beforeEach(async () => {
            await mixr.addGovernor(governor, {
                from: owner,
            });
        });
        // After each test we want to remove the previously added governor.
        afterEach(async () => {
            await mixr.removeGovernor(governor, {
                from: owner,
            });
        });
    };

    describe('whitelist management', () => {
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
        governanceFixture();

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
        governanceFixture();

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

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('deposit functionality', () => {
        describe('actions that should fail', () => {
            beforeEach(async () => {
                const mixrBalance = new BigNumber(await mixr.totalSupply());
                assert.equal(mixrBalance.comparedTo(new BigNumber(0)), 0, 'should be 0.');
            });

            afterEach(async () => {
                const mixrBalance = new BigNumber(await mixr.totalSupply());
                assert.equal(mixrBalance.comparedTo(new BigNumber(0)), 0, 'should be 0.');
            });

            itShouldThrow(
                'forbids depositing without allowance',
                async () => {
                    const valueChange = '0.01';
                    const one = web3.utils.toWei(valueChange, 'ether');
                    await mixr.depositToken(someERC20.address, one, {
                        from: governor,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids depositing bad tokens',
                async () => {
                    const valueChange = '0.01';
                    const one = web3.utils.toWei(valueChange, 'ether');
                    await mixr.depositToken(someERC721.address, one, {
                        from: governor,
                    });
                },
                'revert',
            );
        });
        describe('actions that should work', () => {
            it('can accept approved tokens', async () => {
                const valueChange = '0.01';
                const one = web3.utils.toWei(valueChange, 'ether');
                const oneBg = new BigNumber(web3.utils.toWei(valueChange, 'ether'));
                const previousERC20Balance = new BigNumber(
                    await someERC20.balanceOf(governor),
                );
                const previousMixrBalance = new BigNumber(await mixr.balanceOf(governor));
                await someERC20.approve(mixr.address, one, {
                    from: governor,
                });
                await mixr.depositToken(someERC20.address, one, {
                    from: governor,
                });

                const newERC20Balance = new BigNumber(
                    await someERC20.balanceOf(governor),
                );
                const newMixrBalance = new BigNumber(await mixr.balanceOf(governor));

                assert.equal(
                    previousERC20Balance.minus(newERC20Balance).comparedTo(oneBg),
                    0,
                    'should have less one SampleERC20',
                );

                assert.equal(
                    newMixrBalance.minus(previousMixrBalance).comparedTo(oneBg),
                    0,
                    'should have one more MIXR',
                );
            });
        });
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('redemption functionality', () => {
        it('allows to swap MIXR for something else', async () => {
            const valueChange = '0.01';
            const one = web3.utils.toWei(valueChange, 'ether');
            const oneBg = new BigNumber(web3.utils.toWei(valueChange, 'ether'));
            const previousERC20Balance = new BigNumber(
                await someERC20.balanceOf(governor),
            );
            const previousMixrBalance = new BigNumber(await mixr.balanceOf(governor));
            await mixr.approve(mixr.address, one, {
                from: governor,
            });
            await mixr.redeemMIXR(someERC20.address, one, {
                from: governor,
            });

            const newERC20Balance = new BigNumber(
                await someERC20.balanceOf(governor),
            );
            const newMixrBalance = new BigNumber(await mixr.balanceOf(governor));

            assert.equal(
                newERC20Balance.minus(previousERC20Balance).s,
                oneBg.s,
                'should have less one ERC20',
            );

            assert.equal(
                previousMixrBalance.minus(newMixrBalance).s,
                oneBg.s,
                'should have one more MIXR',
            );
        });

        itShouldThrow(
            'forbids redeeming bad ERC20',
            async () => {
                const valueChange = '0.01';
                const one = web3.utils.toWei(valueChange, 'ether');
                await mixr.redeemMIXR(someERC721.address, one, {
                    from: governor,
                });
            },
            'revert',
        );
    });
});
