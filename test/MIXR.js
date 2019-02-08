const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

const { itShouldThrow, transformNumbers } = require('./utils');

contract('MIXR', (accounts) => {
    let mixr;
    let fixidityLibMock;
    let someERC20;
    let someERC721;
    const mixrDecimals = 24;
    const someERC20Decimals = 18;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    const oneBgERC20 = new BigNumber(10).pow(someERC20Decimals);
    const oneBgMIXR = new BigNumber(10).pow(mixrDecimals);
    // eslint-disable-next-line camelcase
    let fixed_1;

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someERC721 = await SampleERC721.deployed();
        // eslint-disable-next-line camelcase
        fixed_1 = new BigNumber(await fixidityLibMock.fixed_1());
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('deposit functionality', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            someERC20 = await SampleERC20.new(governor,
                transformNumbers(someERC20Decimals, 100),
                18);

            await mixr.addGovernor(governor, {
                from: owner,
            });
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            await mixr.setTokensTargetProportion(
                [someERC20.address],
                [fixed_1.toString(10)],
                {
                    from: governor,
                },
            );
            await someERC20.transfer(user, oneBgERC20.toString(10), { from: governor });
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
                    await mixr.depositToken(someERC20.address, oneBgERC20.toString(10), {
                        from: user,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids depositing unknow token',
                async () => {
                    const someOtherERC20 = await SampleERC20.new(user,
                        new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                        18);
                    await mixr.depositToken(someOtherERC20.address, oneBgERC20.toString(10), {
                        from: user,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids depositing bad tokens',
                async () => {
                    await mixr.depositToken(someERC721.address, oneBgERC20.toString(10), {
                        from: user,
                    });
                },
                'revert',
            );
        });
        describe('actions that should work', () => {
            it('can accept approved tokens', async () => {
                const previousERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const previousMixrBalance = new BigNumber(await mixr.balanceOf(user));
                await someERC20.approve(mixr.address, oneBgERC20.toString(10), {
                    from: user,
                });
                await mixr.depositToken(someERC20.address, oneBgERC20.toString(10), {
                    from: user,
                });

                const newERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const newMixrBalance = new BigNumber(await mixr.balanceOf(user));

                newERC20Balance.should.be.bignumber.equal(previousERC20Balance.minus(oneBgERC20));
                newMixrBalance.should.be.bignumber.equal(previousMixrBalance.plus(oneBgMIXR));
                oneBgERC20.should.be.bignumber.equal(
                    new BigNumber(await someERC20.balanceOf(mixr.address)),
                );
            });
        });
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('redemption functionality', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);

            await mixr.addGovernor(governor, {
                from: owner,
            });
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            await mixr.setTokensTargetProportion(
                [someERC20.address],
                [fixed_1.toString(10)],
                {
                    from: governor,
                },
            );
            // to redeem we actually need some funds
            // so we should deposit first
            await someERC20.transfer(user, oneBgERC20.toString(10), { from: governor });
            await someERC20.approve(mixr.address, oneBgERC20.toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, oneBgERC20.toString(10), {
                from: user,
            });
            const mixrBalance = new BigNumber(await mixr.totalSupply());
            mixrBalance.should.be.bignumber.equal(oneBgMIXR);
        });
        describe('actions that should fail', () => {
            afterEach(async () => {
                const mixrBalance = new BigNumber(await mixr.totalSupply());
                mixrBalance.should.be.bignumber.equal(oneBgMIXR);
            });
            itShouldThrow(
                'forbids redeeming without allowance',
                async () => {
                    await mixr.redeemMIXR(someERC20.address, oneBgERC20.toString(10), {
                        from: user,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids redeeming unknown token',
                async () => {
                    const someOtherERC20 = await SampleERC20.new(user,
                        new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                        18);
                    await mixr.redeemMIXR(someOtherERC20.address, oneBgERC20.toString(10), {
                        from: user,
                    });
                },
                'revert',
            );

            itShouldThrow(
                'forbids redeeming bad ERC20',
                async () => {
                    await mixr.redeemMIXR(someERC721.address, oneBgERC20.toString(10), {
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
                oneBgERC20.should.be.bignumber.equal(
                    new BigNumber(await someERC20.balanceOf(mixr.address)),
                );
                await mixr.approve(mixr.address, oneBgMIXR.toString(10), {
                    from: user,
                });
                await mixr.redeemMIXR(someERC20.address, oneBgMIXR.toString(10), {
                    from: user,
                });

                const newERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const newMixrBalance = new BigNumber(await mixr.balanceOf(user));

                newERC20Balance.should.be.bignumber.equal(previousERC20Balance.plus(oneBgERC20));
                newMixrBalance.should.be.bignumber.equal(previousMixrBalance.minus(oneBgMIXR));
                new BigNumber(
                    await someERC20.balanceOf(mixr.address),
                ).should.be.bignumber.equal(new BigNumber(0));
            });
        });
    });
});
