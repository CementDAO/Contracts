const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('./test/SampleOtherERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');

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
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
        // eslint-disable-next-line camelcase
        fixed_1 = new BigNumber(await fixidityLibMock.fixed_1());
        DEPOSIT = await mixr.DEPOSIT();
        REDEMPTION = await mixr.DEPOSIT();
    });

    describe('proportion after transaction functionality', () => {
        beforeEach(async () => {
            const amountToUser = new BigNumber(10).pow(18).multipliedBy(80);
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            /**
             * We will simulate that there's already some other token in the basket and we will
             * deposit a new one.
             */
            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            await someERC20.transfer(user, amountToUser.toString(10), { from: governor });

            /**
             * token to deposit
             */
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
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
            await someOtherERC20.transfer(user, amountToUser.toString(10), { from: governor });
        });
        it('proportionAfterTransaction(token,1, DEPOSIT()) with an empty basket', async () => {
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someERC20.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1));
        });
        it('proportionAfterTransaction(x,1, DEPOSIT()) with one wei of x already in the basket', async () => {
            await someERC20.transfer(mixr.address, 1, {
                from: governor,
            });
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someERC20.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1));
        });
        it('proportionAfterTransaction(y,1, DEPOSIT()) with one wei of x', async () => {
            await someERC20.transfer(mixr.address, 1, {
                from: governor,
            });
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someOtherERC20.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1).dividedBy(2));
        });
        it('proportionAfterTransaction(token,100 tokens, DEPOSIT()) with an empty basket', async () => {
            const amountTokens = new BigNumber(10).pow(18).multipliedBy(100);
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someERC20.address,
                    amountTokens.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1));
        });
        it('proportionAfterTransaction(token,1000000 tokens, DEPOSIT()) with an empty basket', async () => {
            const amountTokens = new BigNumber(10).pow(24);
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someERC20.address,
                    amountTokens.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1));
        });
        it('proportionAfterTransaction(token,1000000000000 tokens, DEPOSIT()) with an empty basket', async () => {
            const amountTokens = new BigNumber(10).pow(30);
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someERC20.address,
                    amountTokens.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1));
        });
        it('proportionAfterTransaction(x,1, REDEMPTION()) with two wei of x and three wei of y in the basket', async () => {
            await someERC20.transfer(mixr.address, 2, {
                from: governor,
            });
            await someOtherERC20.transfer(mixr.address, 3, {
                from: governor,
            });
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someERC20.address,
                    1,
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1).dividedBy(2).dp(0, 1));
        });
        it('proportionAfterTransaction(x,2, REDEMPTION()) with two wei each of x and y in the basket', async () => {
            await someERC20.transfer(mixr.address, 2, {
                from: governor,
            });
            await someOtherERC20.transfer(mixr.address, 2, {
                from: governor,
            });
            const result = new BigNumber(
                await mixr.proportionAfterTransaction(
                    someERC20.address,
                    2,
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(0);
        });
    });

    describe('deviation after transaction functionality', () => {
        beforeEach(async () => {
            const amountToUser = new BigNumber(10).pow(18).multipliedBy(80);
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            /**
             * We will simulate that there's already some other token in the basket and we will
             * deposit a new one.
             */
            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            await mixr.approveToken(someOtherERC20.address, {
                from: governor,
            });

            await mixr.setTokensTargetProportion(
                [someERC20.address],
                [fixed_1.toString(10)],
                {
                    from: governor,
                },
            );
            await someERC20.transfer(user, amountToUser.toString(10), { from: governor });
            await someOtherERC20.transfer(user, amountToUser.toString(10), { from: governor });
        });

        it('deviationAfterTransaction(x,1,DEPOSIT) with empty basket', async () => {
            const result = new BigNumber(
                await mixr.deviationAfterTransaction(
                    someERC20.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(0);
        });

        it('deviationAfterTransaction(x,1,DEPOSIT) after introducing 1 token y', async () => {
            const amountToTransfer = new BigNumber(10).pow(18);
            await someOtherERC20.transfer(
                mixr.address,
                amountToTransfer.toString(10),
                { from: governor },
            );
            const result = new BigNumber(
                await mixr.deviationAfterTransaction(
                    someERC20.address, 
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(fixed_1.dividedBy(-2).dp(0, 1));
        });

        it('deviationAfterTransaction(x,1,DEPOSIT) after setting token x targetProportion to zero', async () => {
            await mixr.setTokensTargetProportion(
                [
                    someERC20.address,
                    someOtherERC20.address,
                ],
                [
                    0,
                    fixed_1.toString(10),
                ],
                {
                    from: governor,
                },
            );
            const amountToTransfer = new BigNumber(10).pow(18);
            await someOtherERC20.transfer(
                mixr.address,
                amountToTransfer.toString(10),
                { from: governor },
            );
            const result = new BigNumber(
                await mixr.deviationAfterTransaction(
                    someERC20.address, 
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(fixed_1.dividedBy(2).dp(0, 1));
        });
    });
});
