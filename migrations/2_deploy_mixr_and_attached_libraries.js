const MIXR = artifacts.require('./MIXR.sol');
const AddressSetLib = artifacts.require('./AddressSetLib.sol');
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
    // deploy address set lib
    deployer.deploy(AddressSetLib);
    deployer.link(AddressSetLib, MIXR);
    // deploy mixr
    deployer.deploy(MIXR);
};
