const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, transformNumbers } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();


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
    const walletFees = accounts[3];
    // eslint-disable-next-line camelcase
    let fixed_1;
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someERC721 = await SampleERC721.deployed();
        // eslint-disable-next-line camelcase
        fixed_1 = new BigNumber(await fixidityLibMock.fixed_1());
        DEPOSIT = await mixr.DEPOSIT();
        REDEMPTION = await mixr.REDEMPTION();
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('deposit functionality', () => {
        beforeEach(async () => {
            /**
             * deploy mixr and sample erc20
             */
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
            someERC20 = await SampleERC20.new(
                governor,
                transformNumbers(someERC20Decimals, 100),
                someERC20Decimals,
            );

            /**
             * approve tokens
             */
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

            /**
             * set base fee
             */
            const baseFee = new BigNumber(10).pow(23).toString(10);
            await mixr.setTransactionFee(
                someERC20.address,
                baseFee,
                DEPOSIT,
                {
                    from: governor,
                },
            );
            await mixr.setTransactionFee(
                someERC20.address,
                baseFee,
                REDEMPTION,
                {
                    from: governor,
                },
            );

            /**
             * send tokens to user to use in tests
             */
            await someERC20.transfer(
                user,
                transformNumbers(someERC20Decimals, 100),
                { from: governor },
            );

            /**
             * set account to receive fees
             */
            await mixr.setAccountForFees(walletFees, { from: governor });

            /**
             * verify mixr balance is zero
             */
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
                    await mixr.depositToken(
                        someERC20.address,
                        transformNumbers(someERC20Decimals, 1),
                        {
                            from: user,
                        },
                    );
                },
                'revert',
            );

            itShouldThrow(
                'forbids depositing unknow token',
                async () => {
                    const someOtherERC20 = await SampleERC20.new(
                        user,
                        transformNumbers(someERC20Decimals, 100),
                        someERC20Decimals,
                    );
                    await mixr.depositToken(
                        someOtherERC20.address,
                        transformNumbers(someERC20Decimals, 1),
                        {
                            from: user,
                        },
                    );
                },
                'revert',
            );

            itShouldThrow(
                'forbids depositing bad tokens',
                async () => {
                    await mixr.depositToken(
                        someERC721.address,
                        transformNumbers(someERC20Decimals, 100),
                        {
                            from: user,
                        },
                    );
                },
                'revert',
            );
        });
        describe('actions that should work', () => {
            it('can accept approved tokens', async () => {
                /**
                 * get previous balances
                 */
                const previousERC20Balance = new BigNumber(
                    await someERC20.balanceOf(user),
                );
                const previousMixrBalance = new BigNumber(await mixr.balanceOf(user));
                /**
                 * define amounts
                 */
                const oneToken = new BigNumber(10).pow(someERC20Decimals).multipliedBy(1);
                const oneMIXR = new BigNumber(10).pow(mixrDecimals).multipliedBy(1);
                /**
                 * estimate fees to authorize transactions
                 */
                const feeInBasketWei = new BigNumber(
                    await mixr.transactionFee(
                        someERC20.address,
                        oneToken.toString(10),
                        await mixr.DEPOSIT(),
                    ),
                );
                const feeInTokenWei = new BigNumber(
                    await mixr.convertTokensAmount(
                        mixr.address,
                        someERC20.address,
                        feeInBasketWei.toString(10),
                    ),
                );
                const toApprove = oneToken.plus(feeInTokenWei);
                /**
                 * approve and deposit
                 */
                await someERC20.approve(mixr.address, toApprove.toString(10), {
                    from: user,
                });
                await mixr.depositToken(someERC20.address, oneToken.toString(10), {
                    from: user,
                });
                /**
                 * asserts - verify balances
                 */
                new BigNumber(await someERC20.balanceOf(user)).should.be.bignumber.equal(
                    previousERC20Balance.minus(oneToken.plus(feeInTokenWei)),
                );
                new BigNumber(await mixr.balanceOf(user)).should.be.bignumber.equal(
                    previousMixrBalance.plus(oneMIXR),
                );
                new BigNumber(await someERC20.balanceOf(walletFees))
                    .should.be.bignumber.equal(feeInTokenWei);
                /**
                 * since basket was empty, it should be exactly 1 MIXR now
                 */
                oneMIXR.should.be.bignumber.equal(
                    new BigNumber(
                        await mixr.convertTokensAmount(
                            someERC20.address,
                            mixr.address,
                            new BigNumber(await someERC20.balanceOf(mixr.address)),
                        ),
                    ),
                );
            });
        });
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    /* describe('redemption functionality', () => {
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
            await someERC20.transfer(user,
                oneBgERC20.multipliedBy(50).toString(10),
                { from: governor },
            );
            await someERC20.approve(mixr.address, oneBgERC20.multipliedBy(2).toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, oneBgERC20.toString(10), {
                from: user,
            });
            // const mixrBalance = new BigNumber(await mixr.totalSupply());
            // mixrBalance.should.be.bignumber.equal(oneBgMIXR.multipliedBy(2));
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
    }); */
});
