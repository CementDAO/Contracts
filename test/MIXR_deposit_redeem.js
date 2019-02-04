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
            await someERC20.transfer(user, web3.utils.toWei('1', 'ether'), { from: governor });
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
                        from: user,
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
                        from: user,
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
                        from: user,
                    });
                },
                'revert',
            );
        });
        describe('actions that should work', () => {
            it('can accept approved tokens', async () => {
                const valueChange = '0.01';
                const one = web3.utils.toWei(valueChange, 'ether');
                const oneBgERC20 = new BigNumber(web3.utils.toWei(valueChange, 'ether'));
                const previousERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const previousMixrBalance = new BigNumber(await mixr.balanceOf(user));
                await someERC20.approve(mixr.address, one, {
                    from: user,
                });
                await mixr.depositToken(someERC20.address, one, {
                    from: user,
                });

                const newERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const newMixrBalance = new BigNumber(await mixr.balanceOf(user)).dividedBy(1000000);

                assert.equal(
                    previousERC20Balance.minus(oneBgERC20).comparedTo(newERC20Balance),
                    0,
                    'should have less one SampleERC20',
                );
                assert.equal(
                    previousMixrBalance.plus(oneBgERC20).comparedTo(newMixrBalance),
                    0,
                    'should have one more MIXR',
                );
                assert.equal(
                    new BigNumber(await someERC20.balanceOf(mixr.address)).comparedTo(oneBgERC20),
                    0,
                    'MIXR contract should have the balance of 0.01 in someERC20 token',
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
            await someERC20.transfer(user, web3.utils.toWei('1', 'ether'), { from: governor });
            await someERC20.approve(mixr.address, one, {
                from: user,
            });
            await mixr.depositToken(someERC20.address, one, {
                from: user,
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
                        from: user,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids redeeming unknow token',
                async () => {
                    const someOtherERC20 = await SampleERC20.new(user);
                    await mixr.redeemMIXR(someOtherERC20.address, one, {
                        from: user,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids redeeming bad ERC20',
                async () => {
                    await mixr.redeemMIXR(someERC721.address, one, {
                        from: user,
                    });
                },
                'revert',
            );
        });

        describe('actions that should work', () => {
            it('allows to swap MIXR for something else', async () => {
                const previousERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const previousMixrBalance = new BigNumber(await mixr.balanceOf(user));
                assert.equal(
                    new BigNumber(await someERC20.balanceOf(mixr.address)).comparedTo(oneBg),
                    0,
                    'MIXR contract should have the balance of 0.01 in someERC20 token',
                );
                await mixr.approve(mixr.address, one, {
                    from: user,
                });
                await mixr.redeemMIXR(someERC20.address, one, {
                    from: user,
                });

                const newERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const newMixrBalance = new BigNumber(await mixr.balanceOf(user));

                assert.equal(
                    previousERC20Balance.plus(oneBg).comparedTo(newERC20Balance),
                    0,
                    'should have one more SampleERC20',
                );
                assert.equal(
                    previousMixrBalance.minus(oneBg).comparedTo(newMixrBalance),
                    0,
                    'should have less one MIXR',
                );
                assert.equal(
                    new BigNumber(await someERC20.balanceOf(mixr.address)).isZero(),
                    true,
                    'MIXR contract should have the balance of 0 in someERC20 token',
                );
            });
        });
    });
});
