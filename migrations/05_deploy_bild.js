const BILD = artifacts.require('./BILD.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer, network, accounts) => {
    // deploy UtilsLib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, BILD);
    // deploy bild
    const distributor = accounts[1];
    deployer.deploy(BILD, distributor, Whitelist.address);
};
