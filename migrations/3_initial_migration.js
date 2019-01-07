const NEOToken = artifacts.require('./test/NEOToken.sol');

module.exports = (deployer, network, accounts) => {
    deployer.deploy(NEOToken, accounts[1]);
};
