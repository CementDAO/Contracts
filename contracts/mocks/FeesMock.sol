pragma solidity ^0.5.0;

import "../Fees.sol";

/**
 * @title Fee calculation library.
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Calculates the fees for deposits and redemptions according to the 
 * CementDAO whitepaper formulas, using FixidityLib for arithmetic and MIXR.sol
 * to retrieve token basket parameters.
 */
contract FeesMock {

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function REDEMPTION() public pure returns(int8) {
        return Fees.REDEMPTION();
    }

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function TRANSFER() public pure returns(int8) {
        return Fees.TRANSFER();
    }

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    function DEPOSIT() public pure returns(int8) {
        return Fees.DEPOSIT();
    }

    /**
     * @notice (C20) Returns what would be the proportion of a token in the basket
     * after depositing or redeeming a number of tokens. If adding, this 
     * function will throw if the amount of tokens deposited, the current token
     * balance or the basket balance are greater than FixidityLib.maxFixedAdd().
     * *param uint256 _transactionAmount Amount to deposit or redeem in _token wei.
     * @return int256 A fixed point value representing the proportion in the 
     * [0,fixed1()] range.
     */
    function proportionAfterTransaction(
        address _token,
        address _basket, 
        uint256 _transactionAmount, 
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        return Fees.proportionAfterTransaction(
            _token, 
            _basket, 
            _transactionAmount, 
            _transactionType
        );
    }

    /**
     * @notice Returns what would be the deviation from the target 
     * proportion of a token in the basket after a deposit or a redemption.
     * *param uint256 _transactionAmount Amount to deposit or redeem in _token wei.
     * @return int256 A fixed point value representing the proportion in the 
     * [-fixed1(),fixed1()] range.
     */
    function deviationAfterTransaction(
        address _token,
        address _basket, 
        uint256 _transactionAmount,
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        return Fees.deviationAfterTransaction(
            _token,
            _basket,
            _transactionAmount,
            _transactionType
        );
    }

    /**
     * @notice Calculates the deposit or redemption fee as decribed in the CementDAO.
     * whitepaper.
     * *param uint256 _transactionAmount Amount to deposit or redeem in _token wei.
     * @return uint256 The calculated fee in MIX wei.
     */
    function transactionFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount, 
        int8 _transactionType
    )
        public
        view
        returns (uint256) 
    {
        return Fees.transactionFee(
            _token, 
            _basket, 
            _transactionAmount, 
            _transactionType
        );
    }
}
