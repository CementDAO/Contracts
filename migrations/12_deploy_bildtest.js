// TODO: Remove for production deployment
const BILDTest = artifacts.require('./mocks/BILDTest.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer, network, accounts) => {
    // deploy UtilsLib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, BILDTest);
    // deploy bild
    const distributor = accounts[1];
    deployer.deploy(BILDTest, distributor, Whitelist.address);
};
