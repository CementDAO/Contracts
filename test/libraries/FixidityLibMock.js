const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const BigNumber = require('bignumber.js');
const chai = require('chai');

const { itShouldThrow } = require('../utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();


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

    describe('newFromInt256Fraction', () => {
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

    describe('integer', () => {
        it('integer(0)', async () => {
            const result = new BigNumber(await fixidityLibMock.integer(0));
            assert.equal(result.comparedTo(new BigNumber(0)), 0, 'should be zero!');
        });
        it('integer(fixed_1())', async () => {
            const result = new BigNumber(await fixidityLibMock.integer(fixed_1.toString(10)));
            assert.equal(result.comparedTo(fixed_1), 0, 'should be fixed_1!');
        });
        it('integer(newFromInt256(max_fixed_new()))', async () => {
            const newFromMaxFixedNew = new BigNumber(
                await fixidityLibMock.newFromInt256(max_fixed_new.toString(10)),
            );
            const result = new BigNumber(
                await fixidityLibMock.integer(newFromMaxFixedNew.toString(10)),
            );
            assert.equal(
                result.comparedTo(max_fixed_new.multipliedBy(fixed_1)),
                0,
                'should be max_fixed_new()*fixed_1()!',
            );
        });
        it('integer(-fixed_1())', async () => {
            const negativeFixed1 = fixed_1.multipliedBy(-1);
            const result = new BigNumber(
                await fixidityLibMock.integer(negativeFixed1.toString(10)),
            );
            assert.equal(result.comparedTo(negativeFixed1), 0, 'should be -fixed_1()!');
        });
        it('integer(newFromInt256(-max_fixed_new()))', async () => {
            const newFromNegativeMaxFixedNew = new BigNumber(
                await fixidityLibMock.newFromInt256(max_fixed_new.toString(10)),
            ).multipliedBy(-1);
            const result = new BigNumber(
                await fixidityLibMock.integer(newFromNegativeMaxFixedNew.toString(10)),
            );
            assert.equal(
                result.comparedTo(newFromNegativeMaxFixedNew.multipliedBy(fixed_1)),
                0,
                'should be -max_fixed_new()*fixed_1()!',
            );
        });
    });

    describe('fractional', () => {
        it('fractional(0)', async () => {
            const result = new BigNumber(await fixidityLibMock.fractional(0));
            result.should.be.bignumber.equal(0);
        });
        it('fractional(fixed_1())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.fractional(fixed_1.toString(10)),
            );
            result.should.be.bignumber.equal(0);
        });
        it('fractional(fixed_1()-1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.fractional(fixed_1.minus(1).toString(10)),
            );
            result.should.be.bignumber.equal(new BigNumber(10).pow(36).minus(1));
        });
        it('fractional(-fixed_1())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.fractional(fixed_1.multipliedBy(-1).toString(10)),
            );
            result.should.be.bignumber.equal(0);
        });
        it('fractional(-fixed_1()+1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.fractional(fixed_1.multipliedBy(-1).plus(1).toString(10)),
            );
            result.should.be.bignumber.equal(new BigNumber(10).pow(36).minus(1).multipliedBy(-1));
        });
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
