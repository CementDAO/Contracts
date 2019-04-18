pragma solidity ^0.5.7;

interface IFees {
    // solium-disable-next-line mixedcase
    function REDEMPTION() external pure returns(int8);
    // solium-disable-next-line mixedcase
    function TRANSFER() external pure returns(int8);
    // solium-disable-next-line mixedcase
    function DEPOSIT() external pure returns(int8);
    function proportionAfterTransaction(
        address _token,
        address _basket, 
        uint256 _transactionAmount, 
        int8 _transactionType
    ) external view returns (int256);
    function deviationAfterTransaction(
        address _token,
        address _basket, 
        uint256 _transactionAmount,
        int8 _transactionType
    ) external view returns (int256);
    function calculateLogit(
        int256 _targetProportion,
        int256 _deviation
    ) external pure returns (int256);
    function scaleLogit(
        int256 _baseFee,
        int256 _scalingFactor,
        int256 _logitPoint
    ) external pure returns (int256);
    function applyFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount, 
        int256 _fee
    ) external view returns(uint256);
    function transactionFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount, 
        int8 _transactionType
    ) external view returns (uint256);
    function depositFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount
    ) external view returns (uint256);
    function redemptionFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount
    ) external view returns (uint256);
}