const NEOToken = artifacts.require('./test/NEOToken.sol');
const KittyToken = artifacts.require('./test/KittyToken.sol');

module.exports = (deployer, network, accounts) => {
    deployer.deploy(NEOToken, accounts[1]);
    deployer.deploy(KittyToken);
};
