const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('./test/SampleOtherERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow } = require('./utils');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('Fees', (accounts) => {
    let mixr;
    let fixidityLibMock;
    let someERC20;
    let someOtherERC20;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
        DEPOSIT = await mixr.DEPOSIT();
        REDEMPTION = await mixr.REDEMPTION();
    });

    describe('deposit fee calculation functionality', () => {
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
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(2000).toString(10),
                18);
            await mixr.approveToken(someOtherERC20.address, {
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
            const amountToUser = new BigNumber(10).pow(18).multipliedBy(1000);
            await someERC20.transfer(user, amountToUser.toString(10), { from: governor });
            await someOtherERC20.transfer(user, amountToUser.toString(10), { from: governor });
        });
        /*
        * See depositFees_simulation.py
        */

        it('transactionFee(x,70,DEPOSIT) with 30 y in basket - Deposit at deviation ceiling', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(70);
            await someOtherERC20.transfer(
                mixr.address,
                amountInBasket.toString(10),
                { from: governor },
            );
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(147712125471966240000000));
            result.should.be.bignumber.lte(new BigNumber(147712125471966250000000));
        });

        itShouldThrow('transactionFee(x,71,DEPOSIT) with 29 y in basket - Deposit above deviation ceiling.', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(29);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(71);
            await someOtherERC20.transfer(
                mixr.address,
                amountInBasket.toString(10),
                { from: governor },
            );
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            // TODO: assert missing
        }, 'revert');

        it('transactionFee(x,29,DEPOSIT) with 71 y in basket - Deposit below deviation floor.', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(71);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(29);
            await someOtherERC20.transfer(
                mixr.address,
                amountInBasket.toString(10),
                { from: governor },
            );
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528033750000000));
            result.should.be.bignumber.lte(new BigNumber(52287874528033760000000));
        });
        it('transactionFee(x,30,DEPOSIT) with 70 y in basket - Deposit just at deviation floor.', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(70);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(30);
            await someOtherERC20.transfer(mixr.address, amountInBasket, { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528033750000000));
            result.should.be.bignumber.lte(new BigNumber(52287874528033760000000));
        });
        it('transactionFee(x,50,DEPOSIT) with 50 y in basket - Fee == Base Fee.', async () => {
            const baseFee = new BigNumber(await fixidityLibMock.newFixedFraction(1, 10)).toString(10);
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(50);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(50);
            await someOtherERC20.transfer(mixr.address, amountInBasket, { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(new BigNumber(await fixidityLibMock.convertFixed(baseFee, 36, 24)));
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
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(2000).toString(10),
                18);
            await mixr.approveToken(someOtherERC20.address, {
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

        it('transactionFee(x,111,REDEMPTION) - 120 x and 30 y in basket - Below deviation floor', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(111);
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(299997828419000000000000));
            result.should.be.bignumber.lte(new BigNumber(299997828419010000000000));
        });

        it('transactionFee(x,109,REDEMPTION) - 120 x and 30 y in basket - Above deviation floor.', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(109);
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(171025291828538940000000));
            result.should.be.bignumber.lte(new BigNumber(171025291828538950000000));
        });

        it('transactionFee(x,51,REDEMPTION) - 120 x and 30 y in basket - Below deviation ceiling.', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(51);
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(53712301418605630000000));
            result.should.be.bignumber.lte(new BigNumber(53712301418605640000000));
        });
        it('transactionFee(x,49,REDEMPTION) - 120 x and 30 y in basket - Above deviation ceiling.', async () => {
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(120);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(49);
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528033750000000));
            result.should.be.bignumber.lte(new BigNumber(52287874528033760000000));
        });
        it('transactionFee(x,50,REDEMPTION) - 100 x and 50 y in basket - Fee == Base Fee.', async () => {
            const baseFee = new BigNumber(await fixidityLibMock.newFixedFraction(1, 10)).toString(10);
            const xInBasket = new BigNumber(10).pow(18).multipliedBy(100);
            const yInBasket = new BigNumber(10).pow(18).multipliedBy(50);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(50);
            await someERC20.transfer(mixr.address, xInBasket.toString(10), { from: governor });
            await someOtherERC20.transfer(mixr.address, yInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(
                    someERC20.address,
                    amountToTransfer.toString(10),
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber.equal(new BigNumber(await fixidityLibMock.convertFixed(baseFee, 36, 24)));
        });
    });
});
