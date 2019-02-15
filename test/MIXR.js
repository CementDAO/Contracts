const MIXR = artifacts.require('./MIXR.sol');
const FeesMock = artifacts.require('./FeesMock.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const UtilsLibMock = artifacts.require('./UtilsLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();


/**
 * Method to test deposit functionality
 * @param {BigNumber} tokens amount in tokens to be redeem
 * @param {String} user user address doing redemption
 * @param {String} walletFees wallet address were fees are being sent
 * @param {Object} someERC20 erc20 contract
 * @param {Integer} someERC20Decimals erc20 decimals
 * @param {Object} mixr mixr contract
 * @param {Integer} mixrDecimals mixr decimals
 */
const depositTest = async (
    tokens, user, walletFees, someERC20, someERC20Decimals, mixr, mixrDecimals) => {

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
    const tokensToDeposit = tokenNumber(someERC20Decimals, tokens);
    const MIXToMint = new BigNumber(10).pow(mixrDecimals).multipliedBy(tokens);
    /**
     * The deposit fee should be 0.1 MIX
     */
    const depositFee = new BigNumber(10).pow(23).toString(10);
    /**
     * approve and deposit
     */
    await mixr.approve(mixr.address, MIXToMint.toString(10), {
        from: user,
    });
    await someERC20.approve(mixr.address, tokensToDeposit.toString(10), {
        from: user,
    });
    await mixr.depositToken(someERC20.address, tokensToDeposit.toString(10), {
        from: user,
    });
    /**
     * asserts - verify balances
     */
    // User spends the stablecoin
    new BigNumber(await someERC20.balanceOf(user)).should.be.bignumber.equal(
        previousERC20Balance.minus(tokensToDeposit),
    );
    // User receives the MIX minus the fee
    new BigNumber(await mixr.balanceOf(user)).should.be.bignumber.equal(
        previousMixrBalance.plus(MIXToMint.minus(depositFee)),
    );
    // The stakeholder account should get the fees
    new BigNumber(await mixr.balanceOf(walletFees))
        .should.be.bignumber.equal(depositFee);

    // Since basket was empty, it should be exactly equal to the deposit
    tokensToDeposit.should.be.bignumber.equal(
        new BigNumber(await someERC20.balanceOf(mixr.address)),
    );
};
/**
 * Method to test redemption functionality
 * @param {BigNumber} tokens amount in tokens to be redeem
 * @param {String} user user address doing redemption
 * @param {String} walletFees wallet address were fees are being sent
 * @param {Object} someERC20 erc20 contract
 * @param {Integer} someERC20Decimals erc20 decimals
 * @param {Object} mixr mixr contract
 * @param {Integer} mixrDecimals mixr decimals
 */
const redemptionTest = async (
    tokens, user, walletFees, someERC20, someERC20Decimals, mixr, mixrDecimals) => {
    /**
     * variables sets
     */
    const previousERC20Balance = new BigNumber(await someERC20.balanceOf(user));
    const previousMixrBalance = new BigNumber(await mixr.balanceOf(user));
    const previousMixrERC20Balance = new BigNumber(await someERC20.balanceOf(mixr.address));
    const previousWalletFeeBalance = new BigNumber(await mixr.balanceOf(walletFees));
    const oneToken = new BigNumber(10).pow(someERC20Decimals).multipliedBy(tokens);
    const oneMIXR = new BigNumber(10).pow(mixrDecimals).multipliedBy(tokens);
    const utilsLibMock = await UtilsLibMock.deployed();

    /**
     * The redemption fee should be 0.1 MIX
     */
    const redemptionFee = new BigNumber(10).pow(23).toString(10);
    /**
     * approve and deposit
     */
    const amountInBasketWei = new BigNumber(
        await utilsLibMock.convertTokenAmount(
            someERC20.address,
            mixr.address,
            oneToken.toString(10),
        ),
    );
    const totalApprove = amountInBasketWei.plus(redemptionFee);
    await mixr.approve(
        mixr.address,
        totalApprove.toString(10),
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
    const withoutFeeInBasketWei = amountInBasketWei.minus(redemptionFee);
    const withoutFeeInTokenWei = new BigNumber(
        await utilsLibMock.convertTokenAmount(
            mixr.address,
            someERC20.address,
            withoutFeeInBasketWei.toString(10),
        ),
    );
    const feeInTokenWei = new BigNumber(
        await utilsLibMock.convertTokenAmount(
            mixr.address,
            someERC20.address,
            redemptionFee.toString(10),
        ),
    );
    /**
     * if depositing 1 token and the fee is 0.1
     * the new ERC20 user's balance should have more 0.9 tokens
     */
    new BigNumber(
        await someERC20.balanceOf(user),
    ).should.be.bignumber.equal(
        previousERC20Balance.plus(withoutFeeInTokenWei),
    );
    /**
     * since the user redeem one mix, should have one less
     */
    new BigNumber(await mixr.balanceOf(user))
        .should.be.bignumber.equal(
            previousMixrBalance.minus(oneMIXR),
        );
    /**
     * same happen to mixr balance in erc20
     * but we subtracted the fee, because it was sent
     * to the stakeholder wallet in erc20 token
     */
    new BigNumber(
        await someERC20.balanceOf(mixr.address),
    ).should.be.bignumber.equal(
        previousMixrERC20Balance.minus(oneToken.minus(feeInTokenWei)),
    );
    // The stakeholder account should get the fees
    new BigNumber(await mixr.balanceOf(walletFees))
        .should.be.bignumber.equal(previousWalletFeeBalance.plus(redemptionFee));
};

contract('MIXR', (accounts) => {
    let mixr;
    let feesMock;
    let fixidityLibMock;
    let someERC20;
    let someERC721;
    const defaultAmountOfTokens = 100;
    const mixrDecimals = 24;
    const someERC20Decimals = 18;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    const walletFees = accounts[3];
    let fixed1;
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        feesMock = await FeesMock.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someERC721 = await SampleERC721.deployed();
        fixed1 = new BigNumber(await fixidityLibMock.fixed1());
        DEPOSIT = await feesMock.DEPOSIT();
        REDEMPTION = await feesMock.REDEMPTION();
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('deposit functionality', () => {
        const beforeEachMethod = async () => {
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
        };

        describe('actions that should fail', () => {
            beforeEach(beforeEachMethod);

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
                'forbids depositing unknown token',
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

        describe('depositToken', () => {
            beforeEach(beforeEachMethod);

            it('depositToken(50)', async () => {
                depositTest(
                    50, user, walletFees, someERC20, someERC20Decimals, mixr, mixrDecimals,
                );
            });
        });
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('redemption functionality', () => {
        const beforeEachMethod = async () => {
            /**
             * deploy mixr and sample erc20
             */
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
            someERC20 = await SampleERC20.new(
                governor,
                tokenNumber(someERC20Decimals, defaultAmountOfTokens),
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
                tokenNumber(someERC20Decimals, defaultAmountOfTokens),
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
            const tokensToTransfer = new BigNumber(10)
                .pow(someERC20Decimals).multipliedBy(defaultAmountOfTokens);
            /**
             * approve transfers and deposit
             */
            await mixr.approve(mixr.address, baseFee.toString(10), {
                from: user,
            });
            await someERC20.approve(mixr.address, tokensToTransfer.toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, tokensToTransfer.toString(10), {
                from: user,
            });
        };

        describe('actions that should fail', () => {
            beforeEach(beforeEachMethod);

            afterEach(async () => {
                const mixrBalance = new BigNumber(await mixr.totalSupply());
                mixrBalance.should.be.bignumber.equal(
                    tokenNumber(mixrDecimals, defaultAmountOfTokens),
                );
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
            beforeEach(beforeEachMethod);

            it('redeem 1 MIX by 1 token', async () => {
                redemptionTest(
                    1, user, walletFees, someERC20, someERC20Decimals, mixr, mixrDecimals,
                );
            });

            it('redeem 50 MIX by 50 token', async () => {
                redemptionTest(
                    50, user, walletFees, someERC20, someERC20Decimals, mixr, mixrDecimals,
                );
            });
        });
    });
});
