const MIXR = artifacts.require('./MIXR.sol');
const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');
const Utils = artifacts.require('./Utils.sol');

module.exports = (deployer) => {
    // deploy fixidity
    deployer.deploy(FixidityLib);
    deployer.link(FixidityLib, MIXR);
    deployer.link(FixidityLib, LogarithmLib);
    deployer.link(FixidityLib, Utils);
    // deploy logarithm
    deployer.deploy(LogarithmLib);
    deployer.link(LogarithmLib, MIXR);
    // deploy utils
    deployer.deploy(Utils);
    deployer.link(Utils, MIXR);
    // deploy mixr
    deployer.deploy(MIXR);
};
