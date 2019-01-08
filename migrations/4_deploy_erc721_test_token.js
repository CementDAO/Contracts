const KittyToken = artifacts.require('./test/KittyToken.sol');

module.exports = (deployer) => {
    deployer.deploy(KittyToken);
};
