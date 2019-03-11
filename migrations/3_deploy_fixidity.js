const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');
const Fees = artifacts.require('./Fees.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const MIXR = artifacts.require('./MIXR.sol');

module.exports = (deployer) => {
    // deploy fixidity
    deployer.deploy(FixidityLib);
    deployer.link(FixidityLib, LogarithmLib);
    // deploy logarithm
    deployer.deploy(LogarithmLib);
};
