pragma solidity ^0.5.0;


interface IWhitelist {
    function addGovernor(address _userAddress) external;
    function isGovernor(address _userAddress) external view returns (bool);
    function removeGovernor(address _userAddress) external;
    function addStakeholder(address _userAddress) external;
    function isStakeholder(address _userAddress) external view returns (bool);
    function removeStakeholder(address _userAddress) external;
}
