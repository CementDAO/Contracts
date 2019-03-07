const MIXR = artifacts.require('./MIXR.sol');
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
    let feesMock;
    let fixidityLibMock;
    let sampleDetailedERC20;
    let sampleDetailedERC20Other;
    let sampleERC20Decimals;
    let sampleERC20DecimalsOther;
    let minimumFee;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
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
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

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

            /**
             * approve tokens!
             */
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

            const baseFee = new BigNumber(10).pow(23).toString(10);

            await mixr.setTransactionFee(
                sampleDetailedERC20.address,
                baseFee,
                DEPOSIT.toString(10),
                {
                    from: governor,
                },
            );
            await mixr.setTransactionFee(
                sampleDetailedERC20Other.address,
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
        /*
        * See depositFees_simulation.py
        */

        it('transactionFee(x, basket, 70, DEPOSIT) with 30 y in basket - Deposit at deviation ceiling', async () => {
            await sampleDetailedERC20Other.transfer(
                mixr.address,
                tokenNumber(sampleERC20DecimalsOther, 30),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 70),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('147712125471900000000000'));
            result.should.be.bignumber.lte(new BigNumber('147712125472000000000000'));
        });

        itShouldThrow('transactionFee(x, basket, 71, DEPOSIT) '
        + 'with 29 y in basket - Deposit above deviation ceiling.', async () => {
            await sampleDetailedERC20Other.transfer(
                mixr.address,
                tokenNumber(sampleERC20DecimalsOther, 29),
                { from: user },
            );
            await feesMock.transactionFee(
                sampleDetailedERC20.address,
                mixr.address,
                tokenNumber(sampleERC20Decimals, 71),
                DEPOSIT.toString(10),
            );
        }, 'revert');

        it('transactionFee(x, basket, 29, DEPOSIT) with 71 y in basket - Deposit below deviation floor.', async () => {
            await sampleDetailedERC20Other.transfer(
                mixr.address,
                tokenNumber(sampleERC20DecimalsOther, 71),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 29),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('52287874528000000000000'));
            result.should.be.bignumber.lte(new BigNumber('52287874528100000000000'));
        });
        it('transactionFee(x, basket, 30, DEPOSIT) with 70 y in basket - Deposit just at deviation floor.', async () => {
            await sampleDetailedERC20Other.transfer(
                mixr.address,
                tokenNumber(sampleERC20DecimalsOther, 70),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 30),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('52287874528000000000000'));
            result.should.be.bignumber.lte(new BigNumber('52287874528100000000000'));
        });
        it('transactionFee(..., DEPOSIT) >= minimumFee.', async () => {
            await sampleDetailedERC20Other.transfer(
                mixr.address,
                tokenNumber(sampleERC20DecimalsOther, 70),
                { from: user },
            );
            await mixr.setTransactionFee(
                sampleDetailedERC20.address,
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
            result.should.be.bignumber.equal(minimumFee);
        });
        it('transactionFee(x, basket, 50, DEPOSIT) with 50 y in basket - Fee == Base Fee.', async () => {
            const baseFee = new BigNumber(10).pow(23).toString(10);
            await sampleDetailedERC20Other.transfer(
                mixr.address,
                tokenNumber(sampleERC20DecimalsOther, 50),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    tokenNumber(sampleERC20Decimals, 50),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(baseFee);
        });
    });
    describe('redemption fee calculation functionality', () => {
        beforeEach(async () => {
            sampleERC20Decimals = 18;
            sampleERC20DecimalsOther = 18;
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            /**
             * We will simulate that there's already some other token in the basket and we will
             * deposit a new one.
             */
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

            const baseFee = new BigNumber(10).pow(23).toString(10);

            await mixr.setTransactionFee(
                sampleDetailedERC20.address,
                baseFee,
                REDEMPTION.toString(10),
                {
                    from: governor,
                },
            );
            await mixr.setTransactionFee(
                sampleDetailedERC20Other.address,
                baseFee,
                REDEMPTION.toString(10),
                {
                    from: governor,
                },
            );
            const amountToUser = new BigNumber(10).pow(18).multipliedBy(1000);
            await sampleDetailedERC20.transfer(user, amountToUser.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(user, amountToUser.toString(10), { from: governor });
        });
        /*
        * See redemptionFees_simulation.py
        */

        it('transactionFee(x, basket, 111, REDEMPTION) - 120 x and 30 y in basket - Below deviation floor', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(111);
            await sampleDetailedERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(299997828419000000000000));
            result.should.be.bignumber.lte(new BigNumber(299997828419010000000000));
        });

        it('transactionFee(x, basket, 109, REDEMPTION) - 120 x and 30 y in basket - Above deviation floor.', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(109);
            await sampleDetailedERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(171025291828500000000000));
            result.should.be.bignumber.lte(new BigNumber(171025291828600000000000));
        });

        it('transactionFee(x, basket, 51, REDEMPTION) - 120 x and 30 y in basket - Below deviation ceiling.', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(51);
            await sampleDetailedERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(53712301418600000000000));
            result.should.be.bignumber.lte(new BigNumber(53712301418700000000000));
        });
        it('transactionFee(x, basket, 49, REDEMPTION) - 120 x and 30 y in basket - Above deviation ceiling.', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(49);
            await sampleDetailedERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528000000000000));
            result.should.be.bignumber.lte(new BigNumber(52287874528100000000000));
        });
        it('transactionFee(..., REDEMPTION) >= minimumFee.', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(49);
            await sampleDetailedERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            await mixr.setTransactionFee(
                sampleDetailedERC20.address,
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
            result.should.be.bignumber.equal(minimumFee);
        });
        it('transactionFee(x, basket, 50, REDEMPTION) - 100 x and 50 y in basket - Fee == Base Fee.', async () => {
            const baseFee = new BigNumber(10).pow(23).toString(10);
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(100);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(50);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(50);
            await sampleDetailedERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await sampleDetailedERC20Other.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.equal(baseFee);
        });
    });
});
