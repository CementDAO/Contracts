const BILD = artifacts.require('./BILD.sol');

module.exports = (deployer, network, accounts) => {
    // deploy bild
    deployer.deploy(BILD, accounts[1]);
};
