const MIXR = artifacts.require('./MIXR.sol');
const AddressSetLib = artifacts.require('./AddressSetLib.sol');
const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');

module.exports = (deployer) => {
    deployer.deploy(AddressSetLib);
    deployer.link(AddressSetLib, MIXR);
    deployer.deploy(FixidityLib);
    deployer.link(FixidityLib, MIXR);
    deployer.deploy(MIXR);
};
