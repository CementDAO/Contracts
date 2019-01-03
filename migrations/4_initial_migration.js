const ERC20 = artifacts.require('./some/ERC20.sol');

module.exports = (deployer) => {
    deployer.deploy(ERC20);
};
