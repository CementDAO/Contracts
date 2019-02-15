const MIXR = artifacts.require('./MIXR.sol');
const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer) => {
    // deploy fixidity
    deployer.deploy(FixidityLib);
    deployer.link(FixidityLib, MIXR);
    deployer.link(FixidityLib, LogarithmLib);
    deployer.link(FixidityLib, UtilsLib);
    // deploy logarithm
    deployer.deploy(LogarithmLib);
    deployer.link(LogarithmLib, MIXR);
    // deploy utils
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, MIXR);
    // deploy mixr
    deployer.deploy(MIXR);
};
