const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');

const BigNumber = require('bignumber.js');

contract('FixidityLibMock', () => {
    let fixidityLibMock;

    before(async () => {
        fixidityLibMock = await FixidityLibMock.deployed();
    });

    it('newFromInt256', async () => {
        const result = await fixidityLibMock.newFromInt256(1);
        console.log(result.toString(10));
    });

    it('newFromInt256Fraction', async () => {
        const result = await fixidityLibMock.newFromInt256Fraction(1, 10);
        console.log(result.toString(10));
    });

    it('integer', async () => {
        const result = await fixidityLibMock.integer(new BigNumber(2).pow(36));
        console.log(result.toString(10));
    });

    it('integer', async () => {
        const result = await fixidityLibMock.fractional(new BigNumber(2).pow(36));
        console.log(result.toString(10));
    });

    it('abs', async () => {
        const result = await fixidityLibMock.abs(-5);
        console.log(result.toString(10));
    });

    it('multiply', async () => {
        const result = await fixidityLibMock.multiply(2, 3);
        console.log(result.toString(10));
    });

    it('reciprocal', async () => {
        const result = await fixidityLibMock.reciprocal(2);
        console.log(result.toString(10));
    });

    it('divide', async () => {
        const result = await fixidityLibMock.divide(4, 2);
        console.log(result.toString(10));
    });

    it('add', async () => {
        const result = await fixidityLibMock.add(4, 2);
        console.log(result.toString(10));
    });

    it('subtract', async () => {
        const result = await fixidityLibMock.subtract(4, 2);
        console.log(result.toString(10));
    });
});
