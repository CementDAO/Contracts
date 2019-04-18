const MIXR = artifacts.require('./MIXR.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const Fees = artifacts.require('./Fees.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleDetailedERC20 = artifacts.require('./test/SampleDetailedERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { tokenNumber } = require('./utils');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('Fees', (accounts) => {
    let mixr;
    let whitelist;
    let fees;
    let fixidityLibMock;
    let sampleDetailedERC20;
    let sampleDetailedERC20Other;
    let sampleERC20Decimals;
    let sampleERC20DecimalsOther;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    const bild = accounts[3];
    let fixed1;
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        whitelist = await Whitelist.deployed();
        fees = await Fees.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        sampleDetailedERC20 = await SampleDetailedERC20.deployed();
        sampleDetailedERC20Other = await SampleDetailedERC20.deployed();
        fixed1 = new BigNumber(await fixidityLibMock.fixed1());
        DEPOSIT = await fees.DEPOSIT();
        REDEMPTION = await fees.REDEMPTION();
    });

    describe('proportion after transaction functionality', () => {
        beforeEach(async () => {
            sampleERC20Decimals = 18;
            sampleERC20DecimalsOther = 18;
            const amountToUser = tokenNumber(sampleERC20Decimals, 80);
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address, fees.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });

            await mixr.setBILDContract(
                bild,
                { from: owner },
            );

            /**
             * We will simulate that there's already some other token in the basket and we will
             * deposit a new one.
             */
            sampleDetailedERC20 = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20Decimals, 100),
                sampleERC20Decimals,
                'SAMPLE',
                'SMP',
            );
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            await sampleDetailedERC20.transfer(user, amountToUser, { from: governor });

            /**
             * token to deposit
             */
            sampleDetailedERC20Other = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20DecimalsOther, 100),
                sampleERC20DecimalsOther,
                'SAMPLE',
                'SMP',
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
            await sampleDetailedERC20Other.transfer(user, amountToUser, { from: governor });
        });
        it('proportionAfterTransaction(token, basket, 1, DEPOSIT) with an empty basket', async () => {
            const result = new BigNumber(
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed1));
        });
        it('proportionAfterTransaction(x, basket, 1, DEPOSIT) with one wei of x in the basket', async () => {
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

            await sampleDetailedERC20.approve(mixr.address, 1, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20.address, 1, {
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
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed1));
        });
        it('proportionAfterTransaction(y, basket, 1, DEPOSIT) with one wei of x', async () => {
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

            await sampleDetailedERC20.approve(mixr.address, 1, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20.address, 1, {
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
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20Other.address,
                    mixr.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed1).dividedBy(2));
        });
        it('proportionAfterTransaction(token, basket, 100 tokens, DEPOSIT) with an empty basket', async () => {
            const amountTokens = new BigNumber(10).pow(18).multipliedBy(100);
            const result = new BigNumber(
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountTokens.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed1));
        });
        it('proportionAfterTransaction(token, basket, 1000000 tokens, DEPOSIT) with an empty basket', async () => {
            const amountTokens = new BigNumber(10).pow(24);
            const result = new BigNumber(
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountTokens.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed1));
        });
        it('proportionAfterTransaction(token, basket, 10**12 tokens, DEPOSIT) with an empty basket', async () => {
            const amountTokens = new BigNumber(10).pow(30);
            const result = new BigNumber(
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountTokens.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed1));
        });
        it('proportionAfterTransaction(x, basket, 1, REDEMPTION '
        + 'with two wei of x and three wei of y in the basket', async () => {
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

            await sampleDetailedERC20.approve(mixr.address, 2, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20.address, 2, {
                from: user,
            });

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

            await sampleDetailedERC20Other.approve(mixr.address, 3, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, 3, {
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
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    1,
                    REDEMPTION.toString(10),
                ),
            );
            result.should.be.bignumber
                .equal(new BigNumber(fixed1).dividedBy(4).dp(0, 1));
        });
        it('proportionAfterTransaction(x, basket, 2, REDEMPTION) with two wei each of x and y in the basket', async () => {
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

            await sampleDetailedERC20.approve(mixr.address, 2, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20.address, 2, {
                from: user,
            });

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

            await sampleDetailedERC20Other.approve(mixr.address, 2, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, 2, {
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
                await fees.proportionAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
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
            sampleERC20Decimals = 18;
            sampleERC20DecimalsOther = 18;
            const amountToUser = tokenNumber(sampleERC20Decimals, 80);
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address, fees.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });


            await mixr.setBILDContract(
                bild,
                { from: owner },
            );

            /**
             * We will simulate that there's already some other token in the basket and we will
             * deposit a new one.
             */
            sampleDetailedERC20 = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20Decimals, 100),
                sampleERC20Decimals,
                'SAMPLE',
                'SMP',
            );
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            sampleDetailedERC20Other = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20DecimalsOther, 100),
                sampleERC20DecimalsOther,
                'COMPLEX',
                'CLP',
            );
            await mixr.registerDetailedToken(sampleDetailedERC20Other.address, {
                from: governor,
            });

            await mixr.setTokensTargetProportion(
                [sampleDetailedERC20.address, sampleDetailedERC20Other.address],
                [fixed1.toString(10), 0],
                {
                    from: governor,
                },
            );
            await sampleDetailedERC20.transfer(user, amountToUser, { from: governor });
            await sampleDetailedERC20Other.transfer(user, amountToUser, { from: governor });
        });

        it('deviationAfterTransaction(x, basket, 1, DEPOSIT) with empty basket', async () => {
            const result = new BigNumber(
                await fees.deviationAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    1,
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(0);
        });

        it('deviationAfterTransaction(x, basket, 1, DEPOSIT) after introducing 1 token y', async () => {
            const amountToTransfer = new BigNumber(10).pow(18);
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

            await sampleDetailedERC20Other.approve(mixr.address, amountToTransfer, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, amountToTransfer, {
                from: user,
            });

            await mixr.setTokensTargetProportion(
                [sampleDetailedERC20.address, sampleDetailedERC20Other.address],
                [fixed1.toString(10), 0],
                {
                    from: governor,
                },
            );

            const result = new BigNumber(
                await fees.deviationAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(fixed1.dividedBy(-2).dp(0, 1));
        });

        it('deviationAfterTransaction(x, basket, 1, DEPOSIT) targetProportion of x as zero', async () => {
            const amountToTransfer = new BigNumber(10).pow(18);

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

            await sampleDetailedERC20Other.approve(mixr.address, amountToTransfer, {
                from: user,
            });
            await mixr.depositToken(sampleDetailedERC20Other.address, amountToTransfer, {
                from: user,
            });

            await mixr.setTokensTargetProportion(
                [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ],
                [
                    0,
                    fixed1.toString(10),
                ],
                {
                    from: governor,
                },
            );

            const result = new BigNumber(
                await fees.deviationAfterTransaction(
                    sampleDetailedERC20.address,
                    mixr.address,
                    amountToTransfer.toString(10),
                    DEPOSIT.toString(10),
                ),
            );
            result.should.be.bignumber.equal(fixed1.dividedBy(2).dp(0, 1));
        });
    });
});
