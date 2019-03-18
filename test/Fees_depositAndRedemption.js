const MIXR = artifacts.require('./MIXR.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const FeesMock = artifacts.require('./FeesMock.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleDetailedERC20 = artifacts.require('./test/SampleDetailedERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('Fees', (accounts) => {
    let mixr;
    let whitelist;
    let feesMock;
    let fixidityLibMock;
    let sampleDetailedERC20;
    let sampleDetailedERC20Other;
    let sampleERC20Decimals;
    let sampleERC20DecimalsOther;
    const mixrDecimals = 24;
    let minimumFee;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    const bild = accounts[3];
    const baseFee = new BigNumber(10).pow(23).toString(10);
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        whitelist = await Whitelist.deployed();
        feesMock = await FeesMock.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        sampleDetailedERC20 = await SampleDetailedERC20.deployed();
        sampleDetailedERC20Other = await SampleDetailedERC20.deployed();
        DEPOSIT = await feesMock.DEPOSIT();
        REDEMPTION = await feesMock.REDEMPTION();

        minimumFee = new BigNumber('1000000000000000000');
    });

    describe('deposit fee calculation functionality', () => {
        beforeEach(async () => {
            sampleERC20Decimals = 18;
            sampleERC20DecimalsOther = 18;
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });

            await mixr.setBILDContract(
                bild,
                { from: owner },
            );

            sampleDetailedERC20 = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20Decimals, 100),
                sampleERC20Decimals,
                'SAMPLE',
                'SMP',
            );
            sampleDetailedERC20Other = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20DecimalsOther, 100),
                sampleERC20DecimalsOther,
                'COMPLEX',
                'CLP',
            );

            // approve tokens!
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            await mixr.registerDetailedToken(sampleDetailedERC20Other.address, {
                from: governor,
            });

            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );

            await mixr.setBaseFee(
                baseFee,
                DEPOSIT.toString(10),
                {
                    from: governor,
                },
            );
            await sampleDetailedERC20.transfer(
                user,
                tokenNumber(sampleERC20Decimals, 100),
                { from: governor },
            );
            await sampleDetailedERC20Other.transfer(
                user,
                tokenNumber(sampleERC20DecimalsOther, 100),
                { from: governor },
            );
        });
        
        // See depositFees_simulation.py

        it('depositFee(x, basket, 70) with 30 y in basket - Deposit at deviation ceiling', async () => {
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(0).toString(10),
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const depositInERC20Wei = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 30));

            await sampleDetailedERC20Other.approve(mixr.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );

            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 70),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('147712125471900000000000').multipliedBy(70));
            result.should.be.bignumber.lte(new BigNumber('147712125472000000000000').multipliedBy(70));
        });

        itShouldThrow('depositFee(x, basket, 71) '
        + 'with 29 y in basket - Deposit above deviation ceiling.', async () => {
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(0).toString(10),
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const depositInERC20Wei = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 29));

            await sampleDetailedERC20Other.approve(mixr.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );
            await feesMock.transactionFee(
                sampleDetailedERC20.address,
                mixr.address,
                tokenNumber(sampleERC20Decimals, 71),
                DEPOSIT.toString(10),
            );
        }, 'revert');

        it('depositFee(x, basket, 29) with 71 y in basket - Deposit below deviation floor.', async () => {
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(0).toString(10),
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const depositInERC20Wei = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 71));

            await sampleDetailedERC20Other.approve(mixr.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );

            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 29),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('52287874528000000000000').multipliedBy(29));
            result.should.be.bignumber.lte(new BigNumber('52287874528100000000000').multipliedBy(29));
        });
        it('depositFee(x, basket, 30) with 70 y in basket - Deposit just at deviation floor.', async () => {
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(0).toString(10),
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const depositInERC20Wei = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 70));

            await sampleDetailedERC20Other.approve(mixr.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );

            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 30),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('52287874528000000000000').multipliedBy(30));
            result.should.be.bignumber.lte(new BigNumber('52287874528100000000000').multipliedBy(30));
        });
        it('depositFee(...) >= minimumFee.', async () => {
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(0).toString(10),
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const depositInERC20Wei = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 70));

            await sampleDetailedERC20Other.approve(mixr.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );

            await mixr.setBaseFee(
                minimumFee,
                DEPOSIT.toString(10),
                {
                    from: governor,
                },
            );
            // This transaction should have a fee below the base deposit fee,
            // but since baseFee == minimumFee the result should be the minimumFee instead.
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 30),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(new BigNumber(minimumFee).multipliedBy(30));
        });
        it('depositFee(x, basket, 50) with 50 y in basket - Fee == Base Fee.', async () => {
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(0).toString(10),
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const depositInERC20Wei = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 50));
            const depositInMIXWei = new BigNumber(tokenNumber(mixrDecimals, 50));
            await mixr.approve(mixr.address, depositInMIXWei.toString(10), {
                from: user,
            });
            await sampleDetailedERC20Other.approve(mixr.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, depositInERC20Wei.toString(10), {
                from: user,
            });
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 50),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(new BigNumber(baseFee).multipliedBy(50));
        });
    });
    // TODO: Test redemptions are possible with a target proportion of zero.
    describe('redemption fee calculation functionality', () => {
        beforeEach(async () => {
            sampleERC20Decimals = 18;
            sampleERC20DecimalsOther = 18;
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
            await mixr.setBILDContract(bild, { from: owner });
            await whitelist.addGovernor(governor, {
                from: owner,
            });

            await mixr.setBaseFee(
                baseFee,
                REDEMPTION.toString(10),
                {
                    from: governor,
                },
            );

            // Create tokens and register them in the basket
            sampleDetailedERC20 = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20Decimals, 2000),
                sampleERC20Decimals,
                'SAMPLE',
                'SMP',
            );
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            sampleDetailedERC20Other = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20DecimalsOther, 2000),
                sampleERC20DecimalsOther,
                'COMPLEX',
                'CLP',
            );
            await mixr.registerDetailedToken(sampleDetailedERC20Other.address, {
                from: governor,
            });

            // Give some of the tokens to an user so that he can deposit them in the basket
            const amountToUser = new BigNumber(10).pow(18).multipliedBy(1000);
            await sampleDetailedERC20.transfer(user, amountToUser.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(user, amountToUser.toString(10), { from: governor });


            // Deposit x
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                    new BigNumber(0).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const xInBasket = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 120));

            await sampleDetailedERC20.approve(mixr.address, xInBasket.toString(10), {
                from: user,
            });

            await mixr.depositToken(sampleDetailedERC20.address, xInBasket.toString(10), {
                from: user,
            });
            // await sampleDetailedERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(0).toString(10),
                    new BigNumber(await fixidityLibMock.fixed1()).toString(10),
                ],
                {
                    from: governor,
                },
            );
            const yInBasket = new BigNumber(tokenNumber(sampleERC20DecimalsOther, 30));

            await sampleDetailedERC20Other.approve(mixr.address, yInBasket.toString(10), {
                from: user,
            });

            await mixr.depositToken(sampleDetailedERC20Other.address, yInBasket.toString(10), {
                from: user,
            });
            
            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                {
                    from: governor,
                },
            );
        });

        // See redemptionFees_simulation.py
        it('redemptionFee(x, basket, 111) - 120 x and 30 y in basket - Below deviation floor', async () => {
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(111);
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(299997828419000000000000).multipliedBy(111));
            result.should.be.bignumber.lte(new BigNumber(299997828419010000000000).multipliedBy(111));
        });

        it('redemptionFee(x, basket, 109) - 120 x and 30 y in basket - Above deviation floor.', async () => {
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(109);
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(171025291828500000000000).multipliedBy(109));
            result.should.be.bignumber.lte(new BigNumber(171025291828600000000000).multipliedBy(109));
        });

        it('redemptionFee(x, basket, 51) - 120 x and 30 y in basket - Below deviation ceiling.', async () => {
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(51);
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(53712301418600000000000).multipliedBy(51));
            result.should.be.bignumber.lte(new BigNumber(53712301418700000000000).multipliedBy(51));
        });
        it('redemptionFee(x, basket, 49) - 120 x and 30 y in basket - Above deviation ceiling.', async () => {
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(49);
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528000000000000).multipliedBy(49));
            result.should.be.bignumber.lte(new BigNumber(52287874528100000000000).multipliedBy(49));
        });
        it('redemptionFee(...) >= minimumFee.', async () => {
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(49);
            await mixr.setBaseFee(
                minimumFee,
                REDEMPTION.toString(10),
                {
                    from: governor,
                },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.equal(new BigNumber(minimumFee).multipliedBy(49));
        });
        it('redemptionFee(x, basket, 90) - 120 x and 30 y in basket - Fee == Base Fee.', async () => {
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(90);
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.equal(new BigNumber(baseFee).multipliedBy(90));
        });
        itShouldThrow('redemptionFee(x, basket, 121) '
        + '120 x and 30 y in basket - Redemption above basket balance.', async () => {
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(121);
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
        }, 'The MIXR doesn\'t have enough stablecoins for this redemption.');
    });
});
