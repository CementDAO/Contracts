const BILDDataTest = artifacts.require('./mocks/BILDDataTest.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer) => {
    // deploy UtilsLib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, BILDDataTest);
    // deploy bild
    deployer.deploy(BILDDataTest);
};
