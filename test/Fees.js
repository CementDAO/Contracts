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

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
        // eslint-disable-next-line camelcase
        fixed_1 = new BigNumber(await fixidityLibMock.fixed_1());

    });

    describe('proportion after deposit functionality', () => {
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
            await mixr.setTokenTargetProportion(
                someERC20.address,
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
                {
                    from: governor,
                },
            );
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

            await mixr.setTokenTargetProportion(
                someOtherERC20.address,
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                {
                    from: governor,
                },
            );
            await someOtherERC20.transfer(user, amountToUser.toString(10), { from: governor });
        });
        it('proportionAfterDeposit(token,1) with an empty basket', async () => {
            const result = new BigNumber(
                await mixr.proportionAfterDeposit(
                    someERC20.address,
                    1,
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1));
        });
        it('proportionAfterDeposit(x,1) with one wei of x already in the basket', async () => {
            await someERC20.transfer(mixr.address, 1, {
                from: governor,
            });
            const result = new BigNumber(
                await mixr.proportionAfterDeposit(
                    someERC20.address,
                    1,
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1));
        });
        it('proportionAfterDeposit(y,1) with one wei of x', async () => {
            await someERC20.transfer(mixr.address, 1, {
                from: governor,
            });
            const result = new BigNumber(
                await mixr.proportionAfterDeposit(
                    someOtherERC20.address,
                    1,
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed_1).dividedBy(2));
        });
    });

    describe('deviation after deposit functionality', () => {
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
            await mixr.setTokenTargetProportion(
                someERC20.address,
                new BigNumber(await fixidityLibMock.newFixed(1)).toString(10),
                {
                    from: governor,
                },
            );
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

            await mixr.setTokenTargetProportion(
                someOtherERC20.address,
                new BigNumber(0).toString(10),
                {
                    from: governor,
                },
            );
            await someOtherERC20.transfer(user, amountToUser.toString(10), { from: governor });
        });

        it('deviationAfterDeposit(x,1) with empty basket', async () => {
            const result = new BigNumber(
                await mixr.deviationAfterDeposit(someERC20.address, 1),
            );
            result.should.be.bignumber.equal(0);
        });

        it('deviationAfterDeposit(x,1) after introducing 1 token y', async () => {
            const amountToTransfer = new BigNumber(10).pow(18);
            await someOtherERC20.transfer(user, amountToTransfer.toString(10), { from: governor });
            const result = new BigNumber(
                await mixr.deviationAfterDeposit(someERC20.address, 1),
            );
            result.should.be.bignumber.equal(new BigNumber(-0.5));
        });

        it('deviationAfterDeposit(x,1) after setting token x targetProportion to sero', async () => {
            //
        });
    });
});
