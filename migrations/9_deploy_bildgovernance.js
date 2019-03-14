// TODO: Split into BILD_Data -> BILD Governance -> BILD Business
// TODO: Split into BILD_Data -> BILD Governance -> BILD Business
const BILDGovernance = artifacts.require('./BILDGovernance.sol'); 
const Whitelist = artifacts.require('./Whitelist.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');

module.exports = (deployer, network, accounts) => {
    // deploy UtilsLib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, BILDGovernance);
    // deploy bild
    deployer.deploy(BILDGovernance, Whitelist.address);
};
