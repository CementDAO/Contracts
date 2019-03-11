const Whitelist = artifacts.require('./Whitelist.sol');

module.exports = (deployer) => {
    // deploy whitelist
    deployer.deploy(Whitelist);
};
