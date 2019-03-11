const BILD = artifacts.require('./BILD.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer, network, accounts) => {
    // deploy UtilsLib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, BILD);
    // deploy bild
    deployer.deploy(BILD, accounts[1]);
};
