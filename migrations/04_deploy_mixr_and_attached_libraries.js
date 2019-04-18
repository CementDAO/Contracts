const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');
const Fees = artifacts.require('./Fees.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const MIXR = artifacts.require('./MIXR.sol');

module.exports = (deployer) => {
    // link to fixidity
    deployer.link(FixidityLib, UtilsLib);
    deployer.link(FixidityLib, Fees);
    deployer.link(FixidityLib, MIXR);
    // link to logarithm
    deployer.link(LogarithmLib, Fees);
    deployer.link(LogarithmLib, MIXR);
    // deploy utils
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, Fees);
    deployer.link(UtilsLib, MIXR);
    // deploy fees and then mixr
    deployer.deploy(Fees).then(() => deployer.deploy(MIXR, Whitelist.address, Fees.address));
};
