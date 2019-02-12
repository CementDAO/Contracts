const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
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
    let fixed1;
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someERC721 = await SampleERC721.deployed();
        // eslint-disable-next-line camelcase
        fixed1 = new BigNumber(await fixidityLibMock.fixed1());
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
                tokenNumber(someERC20Decimals, 100),
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
                [fixed1.toString(10)],
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
                tokenNumber(someERC20Decimals, 100),
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
                    /**
                     * try to deposit without authorization
                     * should fail because it is not authorized yet.
                     */
                    await mixr.depositToken(
                        someERC20.address,
                        tokenNumber(someERC20Decimals, 1),
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
                    /**
                     * deploy new erc20 contract and try to deposit
                     * should fail because it is not accepted yet
                     */
                    const someOtherERC20 = await SampleERC20.new(
                        user,
                        tokenNumber(someERC20Decimals, 100),
                        someERC20Decimals,
                    );
                    await mixr.depositToken(
                        someOtherERC20.address,
                        tokenNumber(someERC20Decimals, 1),
                        {
                            from: user,
                        },
                    );
                },
                'The given token isn\'t listed as accepted.',
            );

            itShouldThrow(
                'forbids depositing bad tokens',
                async () => {
                    /**
                     * try to deposit an erc721 token
                     * should fail because it is not accepted yet
                     */
                    await mixr.depositToken(
                        someERC721.address,
                        tokenNumber(someERC20Decimals, 100),
                        {
                            from: user,
                        },
                    );
                },
                'The given token isn\'t listed as accepted.',
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
                const oneToken = new BigNumber(10).pow(someERC20Decimals);
                const oneMIXR = new BigNumber(10).pow(mixrDecimals);
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
    describe('redemption functionality', () => {
        before(async () => {
            /**
             * deploy mixr and sample erc20
             */
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
            someERC20 = await SampleERC20.new(
                governor,
                tokenNumber(someERC20Decimals, 100),
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
                [fixed1.toString(10)],
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
                tokenNumber(someERC20Decimals, 100),
                { from: governor },
            );
            /**
             * set account to receive fees
             */
            await mixr.setAccountForFees(walletFees, { from: governor });
            /**
             * send tokens to mixr contract, so we can redeem
             * in order to use redeemMIXR method, we should deposit first
             */
            const tokensToTransfer = new BigNumber(10).pow(someERC20Decimals).multipliedBy(10);
            /**
             * estimate fees to authorize transactions
             */
            const feeInBasketWei = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    tokensToTransfer.toString(10),
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
            /**
             * approve and deposit
             */
            const toApprove = tokensToTransfer.plus(feeInTokenWei);
            await someERC20.approve(mixr.address, toApprove.toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, tokensToTransfer.toString(10), {
                from: user,
            });
        });
        describe('actions that should fail', () => {
            afterEach(async () => {
                const mixrBalance = new BigNumber(await mixr.totalSupply());
                mixrBalance.should.be.bignumber.equal(tokenNumber(mixrDecimals, 10));
            });
            itShouldThrow(
                'forbids redeeming without allowance',
                async () => {
                    await mixr.redeemMIXR(
                        someERC20.address,
                        tokenNumber(someERC20Decimals, 1),
                        {
                            from: user,
                        },
                    );
                },
                'revert',
            );

            itShouldThrow(
                'forbids redeeming unknown token',
                async () => {
                    const someOtherERC20 = await SampleERC20.new(
                        user,
                        tokenNumber(someERC20Decimals, 100),
                        someERC20Decimals,
                    );
                    await mixr.redeemMIXR(
                        someOtherERC20.address,
                        tokenNumber(someERC20Decimals, 1),
                        {
                            from: user,
                        },
                    );
                },
                'The given token isn\'t listed as accepted.',
            );

            itShouldThrow(
                'forbids redeeming bad ERC20',
                async () => {
                    await mixr.redeemMIXR(
                        someERC721.address,
                        tokenNumber(someERC20Decimals, 1),
                        {
                            from: user,
                        },
                    );
                },
                'The given token isn\'t listed as accepted.',
            );
        });

        describe('actions that should work', () => {
            it('allows to swap MIXR for something else', async () => {
                const previousERC20Balance = new BigNumber(await someERC20.balanceOf(user));
                const previousMixrBalance = new BigNumber(await mixr.balanceOf(user));
                const oneToken = new BigNumber(10).pow(someERC20Decimals);
                const oneMIXR = new BigNumber(10).pow(mixrDecimals);

                /**
                 * estimate fees to authorize transactions
                 */
                const feeInBasketWei = new BigNumber(
                    await mixr.transactionFee(
                        someERC20.address,
                        oneToken.toString(10),
                        await mixr.REDEMPTION(),
                    ),
                );
                const feeInTokenWei = new BigNumber(
                    await mixr.convertTokensAmount(
                        mixr.address,
                        someERC20.address,
                        feeInBasketWei.toString(10),
                    ),
                );
                /**
                 * approve and deposit
                 */
                const amountInBasketWei = new BigNumber(
                    await mixr.convertTokensAmount(
                        someERC20.address,
                        mixr.address,
                        oneToken.toString(10),
                    ),
                );
                await mixr.approve(
                    mixr.address,
                    amountInBasketWei.toString(10),
                    {
                        from: user,
                    },
                );
                await someERC20.approve(
                    mixr.address,
                    feeInTokenWei.toString(10),
                    {
                        from: user,
                    },
                );
                /**
                 * redeem
                 */
                await mixr.redeemMIXR(
                    someERC20.address,
                    amountInBasketWei.toString(10),
                    {
                        from: user,
                    },
                );
                /**
                 * asserts
                 */
                new BigNumber(
                    await someERC20.balanceOf(user),
                ).should.be.bignumber.equal(
                    previousERC20Balance.plus(oneToken).minus(feeInTokenWei),
                );
                new BigNumber(await mixr.balanceOf(user))
                    .should.be.bignumber.equal(previousMixrBalance.minus(oneMIXR));
                new BigNumber(
                    await someERC20.balanceOf(mixr.address),
                ).should.be.bignumber.equal(tokenNumber(someERC20Decimals, 9));
            });
        });
    });
});
