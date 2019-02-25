const UtilsLibMock = artifacts.require('../../contracts/mocks/UtilsLibMock.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('UtilsLib', (accounts) => {
    let utilsLibMock;
    let someERC20Decimals;
    let someOtherERC20Decimals;

    before(async () => {
        utilsLibMock = await UtilsLibMock.deployed();
    });

    describe('convertTokenAmount', () => {
        before(async () => {
            someERC20Decimals = 18;
            someOtherERC20Decimals = 20;
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
});
