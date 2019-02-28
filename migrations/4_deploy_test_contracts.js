const BigNumber = require('bignumber.js');

const SampleERC20 = artifacts.require('./test/SampleERC20.sol');
const SampleOtherERC20 = artifacts.require('./test/SampleOtherERC20.sol');
const SamplePlainERC20 = artifacts.require('./test/SamplePlainERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

module.exports = (deployer, network, accounts) => {
    deployer.deploy(SampleERC20, accounts[1],
        new BigNumber(10).pow(18).multipliedBy(525).toString(10), 18);
    deployer.deploy(SampleOtherERC20, accounts[1],
        new BigNumber(10).pow(18).multipliedBy(525).toString(10), 18);
    deployer.deploy(SamplePlainERC20, accounts[1],
        new BigNumber(10).pow(18).multipliedBy(525).toString(10));
    deployer.deploy(SampleERC721);
};
