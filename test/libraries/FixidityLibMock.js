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
    // eslint-disable-next-line camelcase
    let max_fixed_add;
    // eslint-disable-next-line camelcase
    let max_int256;
    // eslint-disable-next-line camelcase
    let fixed_e;
    // eslint-disable-next-line camelcase
    let max_fixed_mul;

    before(async () => {
        fixidityLibMock = await FixidityLibMock.deployed();
        // eslint-disable-next-line camelcase
        fixed_1 = new BigNumber(await fixidityLibMock.fixed_1());
        // eslint-disable-next-line camelcase
        max_fixed_new = new BigNumber(await fixidityLibMock.max_fixed_new());
        // eslint-disable-next-line camelcase
        max_fixed_div = new BigNumber(await fixidityLibMock.max_fixed_div());
        // eslint-disable-next-line camelcase
        max_fixed_add = new BigNumber(await fixidityLibMock.max_fixed_add());
        // eslint-disable-next-line camelcase
        max_int256 = new BigNumber(await fixidityLibMock.max_int256());
        // eslint-disable-next-line camelcase
        fixed_e = new BigNumber(await fixidityLibMock.fixed_e());
        // eslint-disable-next-line camelcase
        max_fixed_mul = new BigNumber(await fixidityLibMock.max_fixed_mul());
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

    describe('abs', () => {
        it('abs(0)', async () => {
            const result = new BigNumber(await fixidityLibMock.abs(0));
            result.should.be.bignumber.equal(0);
        });
        it('abs(fixed_1())', async () => {
            const result = new BigNumber(await fixidityLibMock.abs(fixed_1.toString(10)));
            result.should.be.bignumber.equal(fixed_1);
        });
        it('abs(-fixed_1())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.abs(fixed_1.multipliedBy(-1).toString(10)),
            );
            result.should.be.bignumber.equal(fixed_1);
        });
        it('abs(newFromInt256(max_fixed_new()))', async () => {
            const newFromMaxFixedNew = new BigNumber(
                await fixidityLibMock.newFromInt256(max_fixed_new.toString(10)),
            );
            const result = new BigNumber(
                await fixidityLibMock.abs(newFromMaxFixedNew.toString(10)),
            );
            result.should.be.bignumber.equal(newFromMaxFixedNew.multipliedBy(fixed_1));
        });
        it('abs(newFromInt256(-max_fixed_new()))', async () => {
            const newFromMaxFixedNew = new BigNumber(
                await fixidityLibMock.newFromInt256(max_fixed_new.toString(10)),
            );
            const result = new BigNumber(
                await fixidityLibMock.abs(newFromMaxFixedNew.multipliedBy(-1).toString(10)),
            );
            result.should.be.bignumber.equal(newFromMaxFixedNew.multipliedBy(fixed_1));
        });
    });

    describe('add', () => {
        it('add(0,0)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(0, 0),
            );
            result.should.be.bignumber.equal(0);
        });
        it('add(max_fixed_add(),0)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(max_fixed_add.toString(10), 0),
            );
            result.should.be.bignumber.equal(max_fixed_add);
        });
        it('add(0,max_fixed_add())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(0, max_fixed_add.toString(10)),
            );
            result.should.be.bignumber.equal(max_fixed_add);
        });
        it('add(max_fixed_add()-1,max_fixed_add())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    max_fixed_add.minus(1).toString(10),
                    max_fixed_add.toString(10),
                ),
            );
            result.should.be.bignumber.equal(max_int256.minus(1));
        });
        it('add(max_fixed_add(),max_fixed_add()-1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    max_fixed_add.toString(10),
                    max_fixed_add.minus(1).toString(10),
                ),
            );
            result.should.be.bignumber.equal(max_int256.minus(1));
        });
        it('add(max_fixed_add(),max_fixed_add())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    max_fixed_add.toString(10),
                    max_fixed_add.toString(10),
                ),
            );
            result.should.be.bignumber.equal(max_int256);
        });
        itShouldThrow('add(max_fixed_add() + 1,max_fixed_add())', async () => {
            await fixidityLibMock.add(
                max_fixed_add.plus(1).toString(10),
                max_fixed_add.toString(10),
            );
        }, 'revert');
        it('add(-max_fixed_add(),0)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    max_fixed_add.multipliedBy(-1).toString(10),
                    0,
                ),
            );
            result.should.be.bignumber.equal(max_fixed_add.multipliedBy(-1));
        });
        it('add(0,-max_fixed_add())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    0,
                    max_fixed_add.multipliedBy(-1).toString(10),
                ),
            );
            result.should.be.bignumber.equal(max_fixed_add.multipliedBy(-1));
        });
        it('add(max_fixed_add(),-max_fixed_add())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    max_fixed_add.toString(10),
                    max_fixed_add.multipliedBy(-1).toString(10),
                ),
            );
            result.should.be.bignumber.equal(0);
        });
        it('add(-max_fixed_add(),max_fixed_add())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    max_fixed_add.multipliedBy(-1).toString(10),
                    max_fixed_add.toString(10),
                ),
            );
            result.should.be.bignumber.equal(0);
        });
        it('add(-max_fixed_add(),-max_fixed_add()+1)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.add(
                    max_fixed_add.multipliedBy(-1).toString(10),
                    max_fixed_add.multipliedBy(-1).plus(1).toString(10),
                ),
            );
            result.should.be.bignumber.equal(new BigNumber(1).minus(max_int256));
        });
        itShouldThrow('add(-max_fixed_add(),-max_fixed_add())', async () => {
            await fixidityLibMock.add(
                max_fixed_add.multipliedBy(-1).toString(10),
                max_fixed_add.multipliedBy(-1).toString(10),
            );
        }, 'revert');
    });

    describe('subtract', () => {
        it('subtract', async () => {
            const result = await fixidityLibMock.subtract(4, 2);
            console.log(result.toString(36));
        });
    });

    describe('multiply', () => {
        it('multiply(max_fixed_mul(),0)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    0,
                    0,
                ),
            );
            result.should.be.bignumber.equal(0);
        });
        it('multiply(max_fixed_mul(),0)', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    max_fixed_mul.toString(10),
                    0,
                ),
            );
            result.should.be.bignumber.equal(0);
        });
        it('multiply(max_fixed_mul(),fixed_1())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    max_fixed_mul.toString(10),
                    fixed_1.toString(10),
                ),
            );
            result.should.be.bignumber.equal(max_fixed_mul);
        });
        it('multiply(0, max_fixed_mul())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    0,
                    max_fixed_mul.toString(10),
                ),
            );
            result.should.be.bignumber.equal(0);
        });
        it('multiply(fixed_1(),max_fixed_mul())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    fixed_1.toString(10),
                    max_fixed_mul.toString(10),
                ),
            );
            result.should.be.bignumber.equal(max_fixed_mul);
        });
        it('multiply(fixed_e(),fixed_e())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    fixed_e.toString(10),
                    fixed_e.toString(10),
                ),
            );
            result.should.be.bignumber.equal(fixed_e.multipliedBy(fixed_e));
        });
        it('multiply(-fixed_e(),fixed_e())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    fixed_e.multipliedBy(-1).toString(10),
                    fixed_e.toString(10),
                ),
            );
            result.should.be.bignumber.equal(fixed_e.multipliedBy(-1).multipliedBy(fixed_e));
        });
        it('multiply(fixed_e(),-fixed_e())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    fixed_e.toString(10),
                    fixed_e.multipliedBy(-1).toString(10),
                ),
            );
            result.should.be.bignumber.equal(fixed_e.multipliedBy(fixed_e.multipliedBy(-1)));
        });
        it('multiply(-fixed_e(),-fixed_e())', async () => {
            const result = new BigNumber(
                await fixidityLibMock.multiply(
                    fixed_e.multipliedBy(-1).toString(10),
                    fixed_e.multipliedBy(-1).toString(10),
                ),
            );
            result.should.be.bignumber.equal(
                fixed_e.multipliedBy(-1).multipliedBy(fixed_e.multipliedBy(-1)),
            );
        });
    });

    it('reciprocal', async () => {
        const result = await fixidityLibMock.reciprocal(2);
        console.log(result.toString(36));
    });

    it('divide', async () => {
        const result = await fixidityLibMock.divide(4, 2);
        console.log(result.toString(36));
    });
});
