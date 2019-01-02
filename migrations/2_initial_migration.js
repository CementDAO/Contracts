var MIXR = artifacts.require('./MIXR.sol');
var SetLib = artifacts.require('./SetLib.sol');

module.exports = (deployer) => {
    deployer.deploy(SetLib);
    deployer.link(SetLib, MIXR);
    deployer.deploy(MIXR);
};
