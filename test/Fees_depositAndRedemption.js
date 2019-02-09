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
    // eslint-disable-next-line camelcase
    let fixed_1;
    // eslint-disable-next-line camelcase
    let max_fixed_add;
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
        // eslint-disable-next-line camelcase
        fixed_1 = new BigNumber(await fixidityLibMock.fixed_1());
        // eslint-disable-next-line camelcase
        max_fixed_add = new BigNumber(await fixidityLibMock.max_fixed_add());
        DEPOSIT = await mixr.DEPOSIT();
        REDEMPTION = await mixr.DEPOSIT();
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

            await mixr.setTransactionFee(
                someERC20.address,
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 10)).toString(10),
                DEPOSIT.toString(10),
                {
                    from: governor,
                },
            );
            await mixr.setTransactionFee(
                someOtherERC20.address,
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 10)).toString(10),
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
        * Set proportion x = fixed_1()/2
        * Set proportion y = fixed_1()/2
        * Set scalingFactor = fixed_1()/2
        * Set token.transactionFee(x) = fixed_1()/10
        * Set token.transactionFee(y) = fixed_1()/10
        * Set basket to contain 0 tokens of x and 90 tokens of y. Call transactionFee(x,10,DEPOSIT) 
        * Results: Proportion 0.1; Deviation -0.4; Fee 0.0681588951206413*fixed_1()
        * Set basket to contain 0 tokens of x and 89 tokens of y. Call transactionFee(x,11,DEPOSIT)
        * Results: Proportion 0.11; Deviation -0.39; Fee 0.06699740308471755*fixed_1()
        * Set basket to contain 0 tokens of x and 11 tokens of y. Call transactionFee(x,89,DEPOSIT)
        * Results: Proportion 0.89; Deviation 0.39; Fee 0.13300259691528246*fixed_1()
        * Set basket to contain 0 tokens of x and 10 tokens of y. Call transactionFee(x,90,DEPOSIT)
        * Results: Revert
        */

        it('transactionFee(x,70) with 30 y in basket - Deposit at deviation ceiling', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(30);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(70);
            await someOtherERC20.transfer(mixr.address, amountInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(someERC20.address, amountToTransfer.toString(10), DEPOSIT.toString(10)),
            );
            result.should.be.bignumber.gte(new BigNumber(147712125471966240000000));
            result.should.be.bignumber.lte(new BigNumber(147712125471966250000000));
        });
        
        itShouldThrow('transactionFee(x,71) with 29 y in basket - Deposit above deviation ceiling.', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(29);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(71);
            await someOtherERC20.transfer(mixr.address, amountInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(someERC20.address, amountToTransfer.toString(10), DEPOSIT.toString(10)),
            );
        }, 'revert');

        it('transactionFee(x,29) with 71 y in basket - Deposit below deviation floor.', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(71);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(29);
            await someOtherERC20.transfer(mixr.address, amountInBasket.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(someERC20.address, amountToTransfer.toString(10), DEPOSIT.toString(10)),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528033750000000));
            result.should.be.bignumber.lte(new BigNumber(52287874528033760000000));
        });
        it('transactionFee(x,30) with 70 y in basket - Deposit just at deviation floor.', async () => {
            const amountInBasket = new BigNumber(10).pow(18).multipliedBy(70);
            const amountToTransfer = new BigNumber(10).pow(18).multipliedBy(30);
            await someOtherERC20.transfer(mixr.address, amountInBasket, { from: governor });
            const result = new BigNumber(
                await mixr.transactionFee(someERC20.address, amountToTransfer.toString(10), DEPOSIT.toString(10)),
            );
            result.should.be.bignumber.gte(new BigNumber(52287874528033750000000));
            result.should.be.bignumber.lte(new BigNumber(52287874528033760000000));
        });
    });
});
