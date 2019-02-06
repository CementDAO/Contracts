const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('./test/SampleOtherERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('Base', (accounts) => {
    let mixr;
    let fixidityLibMock;
    let someERC20;
    let someOtherERC20;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
    });

    describe('convertTokensAmount', () => {
        before(async () => {
            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(20).multipliedBy(100).toString(10),
                20);
        });
        it('convertTokensAmount(x, y, 1)', async () => {
            const converted = new BigNumber(
                await mixr.convertTokensAmount(
                    someERC20.address,
                    someOtherERC20.address,
                    1,
                ),
            );
            converted.should.be.bignumber.equal(100);
        });
        it('convertTokensAmount(y, x, 100)', async () => {
            const converted = new BigNumber(
                await mixr.convertTokensAmount(
                    someOtherERC20.address,
                    someERC20.address,
                    100,
                ),
            );
            converted.should.be.bignumber.equal(1);
        });
        it('convertTokensAmount(y, x, 110)', async () => {
            const converted = new BigNumber(
                await mixr.convertTokensAmount(
                    someOtherERC20.address,
                    someERC20.address,
                    110,
                ),
            );
            converted.should.be.bignumber.equal(1);
        });
    });
    describe('convertTokens', () => {
        before(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(20).multipliedBy(100).toString(10),
                20);

            /**
             * approve tokens!
             */
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
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

            /**
             * give some to user for test purposes
             */
            await someERC20.transfer(user,
                new BigNumber(10).pow(18).multipliedBy(90).toString(10), { from: governor });
            await someOtherERC20.transfer(user,
                new BigNumber(10).pow(20).multipliedBy(80).toString(10), { from: governor });

            /**
             * send some tokens
             */
            let amount = new BigNumber(1);
            await someERC20.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, amount.toString(10), {
                from: user,
            });

            amount = new BigNumber(100);
            await someOtherERC20.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.depositToken(someOtherERC20.address, amount.toString(10), {
                from: user,
            });
        });
        it('convertTokens(x, y)', async () => {
            const converted = new BigNumber(
                await mixr.convertTokens(
                    someERC20.address,
                    someOtherERC20.address,
                ),
            );
            converted.should.be.bignumber.equal(100);
        });
        it('convertTokens(y, x)', async () => {
            const converted = new BigNumber(
                await mixr.convertTokens(
                    someOtherERC20.address,
                    someERC20.address,
                ),
            );
            converted.should.be.bignumber.equal(1);
        });
    });
    describe('basketBalance', () => {
        before(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            someERC20 = await SampleERC20.new(governor,
                new BigNumber(10).pow(18).multipliedBy(100).toString(10),
                18);
            someOtherERC20 = await SampleOtherERC20.new(governor,
                new BigNumber(10).pow(20).multipliedBy(100).toString(10),
                20);

            /**
             * approve tokens!
             */
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
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

            /**
             * give some to user for test purposes
             */
            await someERC20.transfer(user,
                new BigNumber(10).pow(18).multipliedBy(90).toString(10), { from: governor });
            await someOtherERC20.transfer(user,
                new BigNumber(10).pow(20).multipliedBy(80).toString(10), { from: governor });
        });
        it('basketBalance() = 0 before introducing any tokens', async () => {
            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(0);
        });
        it('basketBalance() = (10**24) after introducing 1 token of x type', async () => {
            const amount = new BigNumber(10).pow(18).multipliedBy(1);
            await someERC20.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, amount.toString(10), {
                from: user,
            });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(24));
        });
        it('Test basketBalance() = 2*(10**24) after introducing 1 token of x type', async () => {
            const amount = new BigNumber(10).pow(18).multipliedBy(1);
            await someERC20.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, amount.toString(10), {
                from: user,
            });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(24).multipliedBy(2));
        });
        it('Test basketBalance() = 3*(10**24) after introducing 1 token of y type', async () => {
            const amount = new BigNumber(10).pow(20).multipliedBy(1);
            await someOtherERC20.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.depositToken(someOtherERC20.address, amount.toString(10), {
                from: user,
            });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(24).multipliedBy(3));
        });
        it('Test basketBalance() = 2*(10**24) after redeeming 1 MIX token for y tokens', async () => {
            const amount = new BigNumber(10).pow(24).multipliedBy(1);
            await mixr.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.redeemMIXR(someOtherERC20.address, amount.toString(10), {
                from: user,
            });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(24).multipliedBy(2));
        });
        it('Redeem 2 MIX tokens for x, we have an empty basket', async () => {
            const amount = new BigNumber(10).pow(24).multipliedBy(2);
            await mixr.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.redeemMIXR(someERC20.address, amount.toString(10), {
                from: user,
            });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(0);
        });
        it('Test basketBalance() = (10**6) after introducing 1 wei of x type', async () => {
            const amount = new BigNumber(1);
            await someERC20.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.depositToken(someERC20.address, amount.toString(10), {
                from: user,
            });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(6));
        });
        it('Test basketBalance() = (10**6)+(10**4) after introducing 1 token of y type', async () => {
            const amount = new BigNumber(1);
            await someOtherERC20.approve(mixr.address, amount.toString(10), {
                from: user,
            });
            await mixr.depositToken(someOtherERC20.address, amount.toString(10), {
                from: user,
            });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(
                new BigNumber(10).pow(4).plus(new BigNumber(10).pow(6))
            );
        });
    });
});
