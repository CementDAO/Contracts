const UtilsLibMock = artifacts.require('../../contracts/mocks/UtilsLibMock.sol');
const SampleERC20 = artifacts.require('../test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('../test/SampleOtherERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { tokenNumber } = require('../utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('Base', (accounts) => {
    let utilsLibMock;
    let someERC20;
    let someOtherERC20;
    let someERC20Decimals;
    let someOtherERC20Decimals;
    const governor = accounts[1];

    before(async () => {
        utilsLibMock = await UtilsLibMock.deployed();
        someERC20 = await SampleERC20.deployed();
        someOtherERC20 = await SampleOtherERC20.deployed();
    });

    describe('convertTokenAmount', () => {
        before(async () => {
            someERC20Decimals = 18;
            someOtherERC20Decimals = 20;
            /* someERC20 = await SampleERC20.new(
                governor,
                tokenNumber(someERC20Decimals, 100),
                someERC20Decimals,
            );
            someOtherERC20 = await SampleOtherERC20.new(
                governor,
                tokenNumber(someOtherERC20Decimals, 100),
                someOtherERC20Decimals,
            ); */
        });
        it('convertTokenAmount(x, y, 1)', async () => {
            const converted = new BigNumber(
                await utilsLibMock.convertTokenAmount(
                    someERC20Decimals,
                    someOtherERC20Decimals,
                    1,
                ),
            );
            converted.should.be.bignumber.equal(100);
        });
        it('convertTokenAmount(y, x, 100)', async () => {
            const converted = new BigNumber(
                await utilsLibMock.convertTokenAmount(
                    someOtherERC20Decimals,
                    someERC20Decimals,
                    100,
                ),
            );
            converted.should.be.bignumber.equal(1);
        });
        it('convertTokenAmount(y, x, 110)', async () => {
            const converted = new BigNumber(
                await utilsLibMock.convertTokenAmount(
                    someOtherERC20Decimals,
                    someERC20Decimals,
                    110,
                ),
            );
            converted.should.be.bignumber.equal(1);
        });
    });
    /* describe('convertTokens', () => {
        before(async () => {
            someERC20Decimals = 18;
            someOtherERC20Decimals = 20;
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

            // approve tokens!
            
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

            // give some to user for test purposes
            
            await someERC20.transfer(user,
                tokenNumber(someERC20Decimals, 90), { from: governor });
            await someOtherERC20.transfer(user,
                tokenNumber(someOtherERC20Decimals, 80), { from: governor });

            // send some tokens
            
            let amount = new BigNumber(1);
            await someERC20.transfer(mixr.address, amount.toString(10), { from: user });
            amount = new BigNumber(100);
            await someOtherERC20.transfer(mixr.address, amount.toString(10), { from: user });
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
    }); */
});
