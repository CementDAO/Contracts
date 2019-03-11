// TODO: Remove for production deployment
const BILDDataTest = artifacts.require('./mocks/BILDDataTest.sol'); 
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer, network, accounts) => {
    // deploy UtilsLib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, BILDDataTest);
    // deploy bild
    const distributor = accounts[1];
    deployer.deploy(BILDDataTest, distributor);
};
