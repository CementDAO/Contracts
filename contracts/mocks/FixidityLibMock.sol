pragma solidity ^0.5.0;

import "../fixidity/FixidityLib.sol";

/**
 * @dev 
 */

contract FixidityLibMock {

    /**
     * @dev Number of positions that the comma is shifted to the right.
     */
    function digits() public pure returns(uint8) {
        return FixidityLib.digits();
    }
    
    /**
     * @dev This is 1 in the fixed point units used in this library.
     * 10^digits()
     * Hardcoded to 36 digits.
     */
    function fixed_1() public pure returns(int256) {
        return FixidityLib.fixed_1();
    }

    /**
     * @dev The amount of decimals lost on each multiplication operand.
     * Test mul_precision() equals sqrt(fixed_1)
     * Hardcoded to 36 digits.
     */
    function mul_precision() public pure returns(int256) {
        return FixidityLib.mul_precision();
    }

    /**
     * @dev This is e in the fixed point units used in this library.
     * Hardcoded to 36 digits.
     */
    function fixed_e() public pure returns(int256) {
        return FixidityLib.fixed_e();
    }

    /**
     * @dev Maximum value that can be represented in an int256
     * 2^256 / 2 -1
     * Hardcoded to 36 digits.
     */
    function max_int256() public pure returns(int256) {
        return FixidityLib.max_int256();
    }

    /**
     * @dev Minimum value that can be represented in an int256
     * -1 * ((2^256 / 2)-2)
     * Hardcoded to 36 digits.
     */
    function min_int256() public pure returns(int256) {
        return FixidityLib.min_int256();
    }

    /**
     * @dev Maximum value that can be converted to fixed point. Optimize for
     * deployment. 
     * max_int256() / fixed_1()
     * Hardcoded to 36 digits.
     */
    function max_fixed_new() public pure returns(int256) {
        return FixidityLib.max_fixed_new();
    }

    /**
     * @dev Maximum value that can be converted to fixed point. Optimize for
     * deployment. 
     * -(max_int256()-1) / fixed_1()
     * Hardcoded to 36 digits.
     */
    function min_fixed_new() public pure returns(int256) {
        return FixidityLib.min_fixed_new();
    }

    /**
     * @dev Maximum value that can be safely used as a multiplication operator.
     * sqrt(max_fixed_new())
     * Hardcoded to 36 digits.
     */
    function max_fixed_mul() public pure returns(int256) {
        return FixidityLib.max_fixed_mul();
    }

    /**
     * @dev Maximum value that can be safely used as a dividend.
     * divide(max_fixed_div,newFixedFraction(1,fixed_1())) = max_int256().
     * max_int256()/fixed_1()
     * Hardcoded to 36 digits.
     */
    function max_fixed_div() public pure returns(int256) {
        return FixidityLib.max_fixed_div();
    }

    /**
     * @dev Maximum value that can be safely used as an addition operator.
     * max_int256() / 2
     * Hardcoded to 36 digits.
     */
    function max_fixed_add() public pure returns(int256) {
        return FixidityLib.max_fixed_add();
    }

    /**
     * @dev Maximum negative value that can be safely in a subtraction.
     * Test max_fixed_sub() equals min_int256() / 2
     * Hardcoded to 36 digits.
     */
    function max_fixed_sub() public pure returns(int256) {
        return FixidityLib.max_fixed_sub();
    }

    /**
     * @dev Converts an int256 to fixed point units, equivalent to multiplying
     * by 10^digits().
     */
    function newFixed(int256 x)
        public
        pure
        returns (int256)
    {
        return FixidityLib.newFixed(x);
    }

    /**
     * @dev Converts an int256 in the fixed point representation of this 
     * library to a non decimal. All decimal digits will be truncated.
     */
    function fromFixed(int256 x)
        public
        pure
        returns (int256)
    {
        return FixidityLib.fromFixed(x);
    }

    /**
     * @dev Converts two int256 representing a fraction to fixed point units,
     * equivalent to multiplying dividend and divisor by 10^digits().
     */
    function newFixedFraction(
        int256 numerator, 
        int256 denominator
        )
        public
        pure
        returns (int256)
    {
        return FixidityLib.newFixedFraction(numerator, denominator);
    }

    /**
     * @dev Returns the integer part of a fixed point number.
     */
    function integer(int256 v) public pure returns (int256) {
        return FixidityLib.integer(v);
    }


    /**
     * @dev Returns the fractional part of a fixed point number.
     */
    function fractional(int256 v) public pure returns (int256) {
        return FixidityLib.fractional(v);
    }


    /**
     * @dev Converts to positive if negative
     */
    function abs(int256 x) public pure returns (int256) {
        return FixidityLib.abs(x);
    }
    
    /**
     * @dev a*b. If any of the operators is higher than max_fixed_mul() it 
     * might overflow.
     */
    function multiply(int256 a, int256 b) public pure returns (int256) {
        return FixidityLib.multiply(a, b);
    }
    
    /**
     * @dev 1/a
     */
    function reciprocal(int256 a) public pure returns (int256) {
        return FixidityLib.reciprocal(a);
    }

    /**
     * @dev a/b. If the dividend is higher than max_fixed_div() it 
     * might overflow.
     */
    function divide(int256 a, int256 b) public pure returns (int256) {
        return FixidityLib.divide(a, b);
    }

    /**
     * @dev a+b. If any operator is higher than max_fixed_add() it 
     * might overflow.
     */
    function add(int256 a, int256 b) public pure returns (int256) {
        return FixidityLib.add(a, b);
    }

    /**
     * @dev a-b.
     */
    function subtract(int256 a, int256 b) public pure returns (int256) {
        return FixidityLib.subtract(a, b);
    }
}
