const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');
const Fees = artifacts.require('./Fees.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
// TODO: Split into MIXR_Data -> MIXR_Governance -> MIXR_Business
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
    // deploy fees
    deployer.deploy(Fees);
    deployer.link(Fees, MIXR);
    // deploy mixr
    deployer.deploy(MIXR, Whitelist.address);
};
