const MIXR = artifacts.require('./MIXR.sol');
const FeesMock = artifacts.require('./FeesMock.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('./test/SampleOtherERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('Fees', (accounts) => {
    let mixr;
    let feesMock;
    let fixidityLibMock;
    let someERC20;
    let someOtherERC20;
    let someERC20Decimals;
    let someOtherERC20Decimals;
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
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
        DEPOSIT = await feesMock.DEPOSIT();
        REDEMPTION = await feesMock.REDEMPTION();

        minimumFee = new BigNumber('1000000000000000000000000000000');
    });

    describe('deposit fee calculation functionality', () => {
        beforeEach(async () => {
            someERC20Decimals = 18;
            someOtherERC20Decimals = 18;
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            someERC20 = await SampleERC20.new(
                governor,
                tokenNumber(someERC20Decimals, 100),
                someERC20Decimals,
            );
            someOtherERC20 = await SampleOtherERC20.new(
                governor,
                tokenNumber(someOtherERC20Decimals, 100),
                someOtherERC20Decimals,
            );

            /**
             * approve tokens!
             */
            await mixr.registerToken(someERC20.address, {
                from: governor,
            });
            await mixr.registerToken(someOtherERC20.address, {
                from: governor,
            });

            await mixr.setTokensTargetProportion(
                [
                    someERC20.address,
                    someOtherERC20.address,
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
                someERC20.address,
                baseFee,
                DEPOSIT.toString(10),
                {
                    from: governor,
                },
            );
            await mixr.setTransactionFee(
                someOtherERC20.address,
                baseFee,
                DEPOSIT.toString(10),
                {
                    from: governor,
                },
            );
            await someERC20.transfer(
                user,
                tokenNumber(someERC20Decimals, 100),
                { from: governor },
            );
            await someOtherERC20.transfer(
                user,
                tokenNumber(someOtherERC20Decimals, 100),
                { from: governor },
            );
        });
        /*
        * See depositFees_simulation.py
        */

        it('transactionFee(x, basket, 70, DEPOSIT) with 30 y in basket - Deposit at deviation ceiling', async () => {
            await someOtherERC20.transfer(
                mixr.address,
                tokenNumber(someOtherERC20Decimals, 30),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
                    mixr.address,
                    tokenNumber(someERC20Decimals, 70),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('147712125471900000000000'));
            result.should.be.bignumber.lte(new BigNumber('147712125472000000000000'));
        });

        itShouldThrow('transactionFee(x, basket, 71, DEPOSIT) with 29 y in basket - Deposit above deviation ceiling.', async () => {
            await someOtherERC20.transfer(
                mixr.address,
                tokenNumber(someOtherERC20Decimals, 29),
                { from: user },
            );
            await feesMock.transactionFee(
                someERC20.address,
                mixr.address,
                tokenNumber(someERC20Decimals, 71),
                DEPOSIT.toString(10),
            );
        }, 'revert');

        it('transactionFee(x, basket, 29, DEPOSIT) with 71 y in basket - Deposit below deviation floor.', async () => {
            await someOtherERC20.transfer(
                mixr.address,
                tokenNumber(someOtherERC20Decimals, 71),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
                    mixr.address,
                    tokenNumber(someERC20Decimals, 29),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('52287874528000000000000'));
            result.should.be.bignumber.lte(new BigNumber('52287874528100000000000'));
        });
        it('transactionFee(x, basket, 30, DEPOSIT) with 70 y in basket - Deposit just at deviation floor.', async () => {
            await someOtherERC20.transfer(
                mixr.address,
                tokenNumber(someOtherERC20Decimals, 70),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
                    mixr.address,
                    tokenNumber(someERC20Decimals, 30),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber('52287874528000000000000'));
            result.should.be.bignumber.lte(new BigNumber('52287874528100000000000'));
        });
        it('transactionFee(x, basket, 50, DEPOSIT) with 50 y in basket - Fee == Base Fee.', async () => {
            const baseFee = new BigNumber(10).pow(23).toString(10);
            await someOtherERC20.transfer(
                mixr.address,
                tokenNumber(someOtherERC20Decimals, 50),
                { from: user },
            );
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
                    mixr.address,
                    tokenNumber(someERC20Decimals, 50),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(baseFee);
        });
    });
    describe('redemption fee calculation functionality', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            /**
             * We will simulate that there's already some other token in the basket and we will
             * deposit a new one.
             */
            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(2000).toString(10),
                18);
            await mixr.registerToken(someERC20.address, {
                from: governor,
            });
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(2000).toString(10),
                18);
            await mixr.registerToken(someOtherERC20.address, {
                from: governor,
            });

            await mixr.setTokensTargetProportion(
                [
                    someERC20.address,
                    someOtherERC20.address,
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
                someERC20.address,
                baseFee,
                REDEMPTION.toString(10),
                {
                    from: governor,
                },
            );
            await mixr.setTransactionFee(
                someOtherERC20.address,
                baseFee,
                REDEMPTION.toString(10),
                {
                    from: governor,
                },
            );
            const amountToUser = new BigNumber(10).pow(18).multipliedBy(1000);
            await someERC20.transfer(user, amountToUser.toString(10), { from: governor });
            await someOtherERC20.transfer(user, amountToUser.toString(10), { from: governor });
        });
        /*
        * See redemptionFees_simulation.py
        */

        it('transactionFee(x, basket, 111, REDEMPTION) - 120 x and 30 y in basket - Below deviation floor', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(111);
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
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
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
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
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
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
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528000000000000));
            result.should.be.bignumber.lte(new BigNumber(52287874528100000000000));
        });
        it('transactionFee(x, basket, 50, REDEMPTION) - 100 x and 50 y in basket - Fee == Base Fee.', async () => {
            const baseFee = new BigNumber(10).pow(23).toString(10);
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(100);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(50);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(50);
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await feesMock.transactionFee(
                    someERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.equal(baseFee);
        });
    });
});
