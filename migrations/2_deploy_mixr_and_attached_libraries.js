const MIXR = artifacts.require('./MIXR.sol');
const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');

module.exports = (deployer) => {
    // deploy fixidity
    deployer.deploy(FixidityLib);
    deployer.link(FixidityLib, MIXR);
    deployer.link(FixidityLib, LogarithmLib);
    // deploy logarithm
    deployer.deploy(LogarithmLib);
    deployer.link(LogarithmLib, MIXR);
    // deploy mixr
    deployer.deploy(MIXR);
};
