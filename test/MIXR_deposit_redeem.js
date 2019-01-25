const MIXR = artifacts.require('./MIXR.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const BigNumber = require('bignumber.js');
const { itShouldThrow } = require('./utils');

contract('MIXR deposit/redeem', (accounts) => {
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

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('deposit functionality', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            await mixr.setTokenTargetProportion(someERC20.address, 1, {
                from: governor,
            });
            const mixrBalance = new BigNumber(await mixr.totalSupply());
            assert.equal(mixrBalance.comparedTo(new BigNumber(0)), 0, 'should be 0.');
        });
        describe('actions that should fail', () => {
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
                'forbids depositing unknow token',
                async () => {
                    const someOtherERC20 = await SampleERC20.new(user);
                    const valueChange = '0.01';
                    const one = web3.utils.toWei(valueChange, 'ether');
                    await mixr.depositToken(someOtherERC20.address, one, {
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
        const valueChange = '0.01';
        const one = web3.utils.toWei(valueChange, 'ether');
        const oneBg = new BigNumber(web3.utils.toWei(valueChange, 'ether'));
        beforeEach(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            await mixr.setTokenTargetProportion(someERC20.address, 1, {
                from: governor,
            });
            // to redeem we actually need some funds
            // so we should deposit first
            await someERC20.approve(mixr.address, one, {
                from: governor,
            });
            await mixr.depositToken(someERC20.address, one, {
                from: governor,
            });
            const mixrBalance = new BigNumber(await mixr.totalSupply());
            assert.equal(mixrBalance.comparedTo(oneBg), 0, 'should be 0.');
        });
        describe('actions that should fail', () => {
            afterEach(async () => {
                const mixrBalance = new BigNumber(await mixr.totalSupply());
                assert.equal(mixrBalance.comparedTo(oneBg), 0, 'should be 0.');
            });
            itShouldThrow(
                'forbids redeeming without allowance',
                async () => {
                    await mixr.redeemMIXR(someERC20.address, one, {
                        from: governor,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids redeeming unknow token',
                async () => {
                    const someOtherERC20 = await SampleERC20.new(user);
                    await mixr.redeemMIXR(someOtherERC20.address, one, {
                        from: governor,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids redeeming bad ERC20',
                async () => {
                    await mixr.redeemMIXR(someERC721.address, one, {
                        from: governor,
                    });
                },
                'revert',
            );
        });

        describe('actions that should work', () => {
            it('allows to swap MIXR for something else', async () => {
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
        });
    });
});
