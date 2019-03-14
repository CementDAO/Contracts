const FixidityLib = artifacts.require('fixidity/contracts/FixidityLib.sol');
const LogarithmLib = artifacts.require('fixidity/contracts/LogarithmLib.sol');

module.exports = (deployer) => {
    // deploy fixidity
    deployer.deploy(FixidityLib);
    deployer.link(FixidityLib, LogarithmLib);
    // deploy logarithm
    deployer.deploy(LogarithmLib);
};
