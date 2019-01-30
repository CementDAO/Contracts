const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const BigNumber = require('bignumber.js');

const { itShouldThrow } = require('../utils');


contract('FixidityLibMock', () => {
    let fixidityLibMock;
    // eslint-disable-next-line camelcase
    let fixed_1;
    // eslint-disable-next-line camelcase
    let max_fixed_new;
    // eslint-disable-next-line camelcase
    let max_fixed_div;

    before(async () => {
        fixidityLibMock = await FixidityLibMock.deployed();
        // eslint-disable-next-line camelcase
        fixed_1 = new BigNumber(await fixidityLibMock.fixed_1());
        // eslint-disable-next-line camelcase
        max_fixed_new = new BigNumber(await fixidityLibMock.max_fixed_new());
        // eslint-disable-next-line camelcase
        max_fixed_div = new BigNumber(await fixidityLibMock.max_fixed_div());
    });

    it('fixed_1', async () => {
        assert.equal(fixed_1.comparedTo(new BigNumber('1000000000000000000000000000000000000')), 0, '');
    });

    describe('newFromInt256', () => {
        it('newFromInt256(0)', async () => {
            const result = await fixidityLibMock.newFromInt256(0);
            assert.equal(result, 0, 'should be 0!');
        });
        it('newFromInt256(1)', async () => {
            const result = new BigNumber(await fixidityLibMock.newFromInt256(1));
            assert.equal(result.comparedTo(fixed_1), 0, 'should be fixed_1!');
        });
        it('newFromInt256(max_fixed_new())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.newFromInt256(max_fixed_new.toString(10)),
            );
            assert.equal(
                result.comparedTo(fixed_1.multipliedBy(max_fixed_new)),
                0,
                'should be max_fixed_new!',
            );
        });
        itShouldThrow(
            'newFromInt256(max_fixed_new()+1)',
            async () => {
                await fixidityLibMock
                    .newFromInt256(max_fixed_new.plus(1).toString(10));
            },
            'revert',
        );
    });
    describe('newFromInt256Fraction', async () => {
        itShouldThrow(
            'newFromInt256Fraction(max_fixed_div()+1,1)',
            async () => {
                await fixidityLibMock
                    .newFromInt256Fraction(max_fixed_div.plus(1).toString(10), 1);
            },
            'revert',
        );
        itShouldThrow(
            'newFromInt256Fraction(1,max_fixed_div()+1)',
            async () => {
                await fixidityLibMock
                    .newFromInt256Fraction(1, max_fixed_div.plus(1).toString(10));
            },
            'revert',
        );
        itShouldThrow(
            'newFromInt256Fraction(1,0)',
            async () => {
                await fixidityLibMock
                    .newFromInt256Fraction(1, 0);
            },
            'revert',
        );
        it('newFromInt256Fraction(0,1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.newFromInt256Fraction(0, 1),
            );
            assert.equal(result.comparedTo(new BigNumber(0)), 0, 'should be zero!');
        });
        it('newFromInt256Fraction(1,1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.newFromInt256Fraction(1, 1),
            );
            assert.equal(result.comparedTo(fixed_1), 0, 'should be fixed_1!');
        });
        it('newFromInt256Fraction(max_fixed_div(),1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.newFromInt256Fraction(max_fixed_div.toString(10), 1),
            );
            assert.equal(result.comparedTo(max_fixed_div), 0, 'should be max_fixed_div!');
        });
        it('newFromInt256Fraction(1,fixed_1())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.newFromInt256Fraction(1, fixed_1.toString(10)),
            );
            assert.equal(result.comparedTo(new BigNumber(1)), 0, 'should be one!');
        });
        it('newFromInt256Fraction(1,fixed_1()-1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.newFromInt256Fraction(1, fixed_1.minus(1).toString(10)),
            );
            assert.equal(result.comparedTo(new BigNumber(0)), 0, 'should be zero!');
        });
    });

    it('integer', async () => {
        const result = await fixidityLibMock.integer(new BigNumber(2).pow(36));
        console.log(result.toString(36));
    });

    it('fractional', async () => {
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
