pragma solidity ^0.5.7;

interface IMIXR {
    function getDecimals(address _token) external view returns(uint8);
    function decimals() external view returns(uint8);
    function basketBalance() external view returns(uint256);
    function getTargetProportion(address _token) external view returns(int256);
    function minimumFee() external view returns(int256);
    function baseDepositFee() external view returns(int256);
    function baseRedemptionFee() external view returns(int256);
    function scalingFactor() external view returns(int256);
}