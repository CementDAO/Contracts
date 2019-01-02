var ERC20 = artifacts.require('./test/ERC20.sol');

module.exports = (deployer) => {
    deployer.deploy(ERC20);
};
