const NEOToken = artifacts.require('./NEOToken.sol');

module.exports = (deployer, network, accounts) => {
    deployer.deploy(NEOToken, accounts[1]);
};
