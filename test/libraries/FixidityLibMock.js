const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');

const BigNumber = require('bignumber.js');

contract('FixidityLibMock', () => {
    let fixidityLibMock;

    before(async () => {
        fixidityLibMock = await FixidityLibMock.deployed();
    });

    it('fixed_1', async () => {
        const result = await fixidityLibMock.fixed_1();
        console.log(result.toString(36)); // Need to print 78 digits.
    });

    it('fixed_e', async () => {
        const result = await fixidityLibMock.fixed_e();
        console.log(result.toString(36));
    });

    it('fixed_pi', async () => {
        const result = await fixidityLibMock.fixed_pi();
        console.log(result.toString(36));
    });

    it('fixed_exp_10', async () => {
        const result = await fixidityLibMock.fixed_exp_10();
        console.log(result.toString(36));
    });

    it('max_int256', async () => {
        const result = await fixidityLibMock.max_int256();
        console.log(result.toString(36));
    });

    it('min_int256', async () => {
        const result = await fixidityLibMock.min_int256();
        console.log(result.toString(36));
    });

    it('max_fixed_new', async () => {
        const result = await fixidityLibMock.max_fixed_new();
        console.log(result.toString(36));
    });

    it('max_fixed_mul', async () => {
        const result = await fixidityLibMock.max_fixed_mul();
        console.log(result.toString(36));
    });

    it('max_fixed_div', async () => {
        const result = await fixidityLibMock.max_fixed_div();
        console.log(result.toString(36));
    });

    it('max_fixed_add', async () => {
        const result = await fixidityLibMock.max_fixed_add();
        console.log(result.toString(36));
    });

    it('newFromInt256', async () => {
        const result = await fixidityLibMock.newFromInt256(1);
        console.log(result.toString(36));
    });

    it('newFromInt256Fraction', async () => {
        const result = await fixidityLibMock.newFromInt256Fraction(1, 10);
        console.log(result.toString(36));
    });

    it('integer', async () => {
        const result = await fixidityLibMock.integer(new BigNumber(2).pow(36));
        console.log(result.toString(36));
    });

    it('integer', async () => {
        const result = await fixidityLibMock.fractional(new BigNumber(2).pow(36));
        console.log(result.toString(36));
    });

    it('abs', async () => {
        const result = await fixidityLibMock.abs(-5);
        console.log(result.toString(36));
    });

    it('multiply', async () => {
        const result = await fixidityLibMock.multiply(2, 3);
        console.log(result.toString(36));
    });

    it('reciprocal', async () => {
        const result = await fixidityLibMock.reciprocal(2);
        console.log(result.toString(36));
    });

    it('divide', async () => {
        const result = await fixidityLibMock.divide(4, 2);
        console.log(result.toString(36));
    });

    it('add', async () => {
        const result = await fixidityLibMock.add(4, 2);
        console.log(result.toString(36));
    });

    it('subtract', async () => {
        const result = await fixidityLibMock.subtract(4, 2);
        console.log(result.toString(36));
    });
});
