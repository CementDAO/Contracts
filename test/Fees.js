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

    before(async () => {
        mixr = await MIXR.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
    });

    describe('deposit fee functionality', () => {
        beforeEach(async () => {
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
                new BigNumber(await fixidityLibMock.newFromInt256Fraction(1, 4)).toString(10),
                {
                    from: governor,
                },
            );
            const valueToDeposit = web3.utils.toWei('90', 'ether');
            await someERC20.transfer(user, valueToDeposit, { from: governor });
            await someERC20.approve(mixr.address, valueToDeposit, {
                from: user,
            });
            await mixr.depositToken(someERC20.address, valueToDeposit, {
                from: user,
            });

            /**
             * token to deposit
             */
            someOtherERC20 = await SampleOtherERC20.new(governor);
            await mixr.approveToken(someOtherERC20.address, {
                from: governor,
            });

            await someOtherERC20.transfer(user, web3.utils.toWei('50', 'ether'), { from: governor });
            await mixr.setTokenTargetProportion(
                someOtherERC20.address,
                new BigNumber(await fixidityLibMock.newFromInt256Fraction(1, 2)).toString(10),
                {
                    from: governor,
                },
            );
        });
        /**
         * Test deviation = -0.4, proportion = 0.5, base = fixed_1()/10
         *      proportionAfterDeposit = 0.1, proportion = 0.5
         *      Set proportion to 0.5 for token x. Set basket to contain just 90 tokens of token y.
         *          Call depositFee(x,10);
         */
        describe('deposit fee -> 10', () => {
            it('basketBalance', async () => {
                const result = new BigNumber(
                    web3.utils.fromWei(await mixr.basketBalance(), 'ether'),
                );
                result.should.be.bignumber.equal(new BigNumber(90));
            });
            it('proportionAfterDeposit', async () => {
                const valueToTransfer = web3.utils.toWei('10', 'ether');
                const result = new BigNumber(
                    await mixr.proportionAfterDeposit(
                        someERC20.address,
                        valueToTransfer,
                        {
                            from: user,
                        },
                    ),
                );
                result.should.be.bignumber
                    .equal(new BigNumber('1111111111111111100000000000000000000'));
            });
            it('deviationAfterDeposit', async () => {
                const valueToTransfer = web3.utils.toWei('10', 'ether');
                const result = new BigNumber(
                    await mixr.deviationAfterDeposit(
                        someERC20.address,
                        valueToTransfer,
                        {
                            from: user,
                        },
                    ),
                );
                result.should.be.bignumber
                    .equal(new BigNumber('861111111111111100000000000000000000'));
            });
            it('depositFee', async () => {
                const valueToTransfer = web3.utils.toWei('10', 'ether');
                const result = new BigNumber(
                    await mixr.depositFee(
                        someERC20.address,
                        valueToTransfer,
                        {
                            from: user,
                        },
                    ),
                );
                console.log(result.toString(10));
            });
        });
    });
});
