const MIXR = artifacts.require('./MIXR.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const FeesMock = artifacts.require('./FeesMock.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const UtilsLibMock = artifacts.require('./UtilsLibMock.sol');
const SampleDetailedERC20 = artifacts.require('./test/SampleDetailedERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();


/**
 * Method to test redemption functionality
 * @param {BigNumber} tokens amount in tokens to be redeem
 * @param {String} user user address doing redemption
 * @param {String} stakeholders wallet address were fees are being sent
 * @param {Object} sampleDetailedERC20 erc20 contract
 * @param {Integer} sampleERC20Decimals erc20 decimals
 * @param {Object} mixr mixr contract
 * @param {Integer} mixrDecimals mixr decimals
 */
const redemptionTest = async (
    tokens, user, stakeholders, sampleDetailedERC20, sampleERC20Decimals, mixr, mixrDecimals) => {
    /**
     * variables sets
     */
    const previousERC20Balance = new BigNumber(await sampleDetailedERC20.balanceOf(user));
    const previousMixrBalance = new BigNumber(await mixr.balanceOf(user));
    const previousMixrERC20Balance = new BigNumber(await sampleDetailedERC20.balanceOf(mixr.address));
    const previousWalletFeeBalance = new BigNumber(await mixr.balanceOf(stakeholders));
    const oneToken = new BigNumber(10).pow(sampleERC20Decimals).multipliedBy(tokens);
    const oneMIXR = new BigNumber(10).pow(mixrDecimals).multipliedBy(tokens);
    const utilsLibMock = await UtilsLibMock.deployed();

    /**
     * The redemption fee should be 0.1
     */
    const redemptionFee = 0.1;
    /**
     * approve and deposit
     */
    const amountInBasketWei = new BigNumber(
        await utilsLibMock.convertTokenAmount(
            sampleERC20Decimals,
            mixrDecimals,
            oneToken.toString(10),
        ),
    );
    const feeInBasketWei = amountInBasketWei.multipliedBy(redemptionFee);
    const totalApprove = amountInBasketWei.plus(feeInBasketWei);
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
    await mixr.redeemMIX(
        sampleDetailedERC20.address,
        amountInBasketWei.toString(10),
        {
            from: user,
        },
    );
    /**
     * asserts
     */
    const withoutFeeInBasketWei = amountInBasketWei.minus(feeInBasketWei);
    const withoutFeeInTokenWei = new BigNumber(
        await utilsLibMock.convertTokenAmount(
            mixrDecimals,
            sampleERC20Decimals,
            withoutFeeInBasketWei.toString(10),
        ),
    );
    const feeInTokenWei = new BigNumber(
        await utilsLibMock.convertTokenAmount(
            mixrDecimals,
            sampleERC20Decimals,
            feeInBasketWei.toString(10),
        ),
    );
    /**
     * if depositing 1 token and the fee is 0.1
     * the new ERC20 user's balance should have more 0.9 tokens
     */
    new BigNumber(
        await sampleDetailedERC20.balanceOf(user),
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
        await sampleDetailedERC20.balanceOf(mixr.address),
    ).should.be.bignumber.equal(
        previousMixrERC20Balance.minus(oneToken.minus(feeInTokenWei)),
    );
    // The stakeholder account should get the fees
    new BigNumber(await mixr.balanceOf(stakeholders))
        .should.be.bignumber.equal(previousWalletFeeBalance.plus(feeInBasketWei));
};

contract('MIXR', (accounts) => {
    let mixr;
    let whitelist;
    let feesMock;
    let fixidityLibMock;
    let sampleDetailedERC20;
    let someERC721;
    const defaultAmountOfTokens = 100;
    const sampleERC20Decimals = 18;
    const mixrDecimals = 24;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    const stakeholders = accounts[3];
    const user2 = accounts[4];
    let fixed1;
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        whitelist = await Whitelist.deployed();
        feesMock = await FeesMock.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        sampleDetailedERC20 = await SampleDetailedERC20.deployed();
        someERC721 = await SampleERC721.deployed();
        fixed1 = new BigNumber(await fixidityLibMock.fixed1());
        DEPOSIT = await feesMock.DEPOSIT();
        REDEMPTION = await feesMock.REDEMPTION();
    });

    describe('redemption functionality', () => {
        beforeEach(async () => {
            /**
             * deploy mixr and sample erc20
             */
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });

            sampleDetailedERC20 = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20Decimals, defaultAmountOfTokens),
                sampleERC20Decimals,
                'SAMPLE',
                'SMP',
            );
            /**
             * Register tokens and set token data to allow transactions.
             */
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            await mixr.setTokensTargetProportion(
                [sampleDetailedERC20.address],
                [fixed1.toString(10)],
                {
                    from: governor,
                },
            );
            /**
             * set base fee
             */
            const baseFee = new BigNumber(10).pow(23).toString(10);
            await mixr.setBaseFee(
                baseFee,
                DEPOSIT,
                {
                    from: governor,
                },
            );
            await mixr.setBaseFee(
                baseFee,
                REDEMPTION,
                {
                    from: governor,
                },
            );
            /**
             * send tokens to user to use in tests
             */
            await sampleDetailedERC20.transfer(
                user,
                tokenNumber(sampleERC20Decimals, defaultAmountOfTokens),
                { from: governor },
            );
            /**
             * set account to receive fees
             */
            await mixr.setBILDContract(stakeholders, { from: owner });
            /**
             * send tokens to mixr contract, so we can redeem
             * in order to use redeemMIX method, we should deposit first
             */
            const tokensToTransfer = new BigNumber(10)
                .pow(sampleERC20Decimals).multipliedBy(defaultAmountOfTokens);
            /**
             * approve transfers and deposit
             */

            await sampleDetailedERC20.approve(mixr.address, tokensToTransfer.toString(10), {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20.address, tokensToTransfer.toString(10), {
                from: user,
            });
        });

        itShouldThrow(
            'forbids redeeming without allowance',
            async () => {
                await mixr.redeemMIX(
                    sampleDetailedERC20.address,
                    tokenNumber(sampleERC20Decimals, 1),
                    {
                        from: user2,
                    },
                );
            },
            'revert',
        );

        itShouldThrow(
            'forbids redeeming a token that hasn\'t been registered yet.',
            async () => {
                const newSomeOtherERC20 = await SampleDetailedERC20.new(
                    user,
                    tokenNumber(sampleERC20Decimals, 100),
                    sampleERC20Decimals,
                    'SAMPLE',
                    'SMP',
                );
                await mixr.redeemMIX(
                    newSomeOtherERC20.address,
                    tokenNumber(sampleERC20Decimals, 1),
                    {
                        from: user,
                    },
                );
            },
            'Token is not registered.',
        );

        itShouldThrow(
            'forbids redeeming bad ERC20',
            async () => {
                await mixr.redeemMIX(
                    someERC721.address,
                    tokenNumber(sampleERC20Decimals, 1),
                    {
                        from: user,
                    },
                );
            },
            'Token is not registered.',
        );

        it('redeem 1 MIX by 1 token', async () => {
            await redemptionTest(
                1, user, stakeholders, sampleDetailedERC20, sampleERC20Decimals, mixr, mixrDecimals,
            );
        });

        it('redeem 50 MIX by 50 token', async () => {
            await redemptionTest(
                50, user, stakeholders, sampleDetailedERC20, sampleERC20Decimals, mixr, mixrDecimals,
            );
        });
    });
});
