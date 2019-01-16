const MIXR = artifacts.require('./MIXR.sol');
const AddressSetLib = artifacts.require('./AddressSetLib.sol');

module.exports = (deployer) => {
    deployer.deploy(AddressSetLib);
    deployer.link(AddressSetLib, MIXR);
    deployer.deploy(MIXR);
};
