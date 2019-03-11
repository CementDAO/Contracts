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
    deployer.link(FixidityLib, UtilsLib);
    deployer.link(FixidityLib, Fees);
    deployer.link(FixidityLib, MIXR);
    // deploy logarithm
    deployer.deploy(LogarithmLib);
    deployer.link(LogarithmLib, Fees);
    deployer.link(LogarithmLib, MIXR);
    // deploy utils
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, Fees);
    deployer.link(UtilsLib, MIXR);
    // deploy fees
    deployer.deploy(Fees);
    deployer.link(Fees, MIXR);
    // deploy whitelist
    deployer.deploy(Whitelist);
    // deploy mixr
    deployer.deploy(MIXR, Whitelist.address);
};
