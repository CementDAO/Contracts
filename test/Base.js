const MIXR = artifacts.require('./MIXR.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('Fees', (accounts) => {
    let mixr;
    let fixidityLibMock;
    let someERC20;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
    });

    describe('basketBalance', () => {
        before(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });

            /**
             * We will simulate that there's already some other token in the basket and we will
             * deposit a new one.
             */
            someERC20 = await SampleERC20.new(governor);
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
            const fee = new BigNumber('1000000000000000000000000000000');
            await mixr.setDepositFee(someERC20.address, fee.toString(10), { from: governor });
            await someERC20.transfer(user,
                (new BigNumber(10).pow(18).multipliedBy(9)).toString(10),
                { from: governor });
        });
        it('basketBalance() = 0', async () => {
            const balance = new BigNumber(await mixr.basketBalance());
            balance.should.be.bignumber.equal(0);
        });
        it('basketBalance() = (10**24)', async () => {
            const valueToDeposit = new BigNumber(1).pow(18);
            await someERC20.approve(mixr.address, valueToDeposit, {
                from: user,
            });
            await mixr.depositToken(someERC20.address, valueToDeposit, {
                from: user,
            });
            const balance = new BigNumber(await mixr.basketBalance());
            balance.should.be.bignumber.equal(valueToDeposit);
        });
    });
});