// TODO: Remove for production deployment
const BILDData = artifacts.require('./BILDData.sol'); 
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer, network, accounts) => {
    // deploy UtilsLib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, BILDData);
    // deploy bild
    const distributor = accounts[1];
    deployer.deploy(BILDData, distributor);
};
