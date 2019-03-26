const BigNumber = require('bignumber.js');

const SampleDetailedERC20 = artifacts.require('./test/SampleDetailedERC20.sol');
const SamplePlainERC20 = artifacts.require('./test/SamplePlainERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

module.exports = (deployer, network, accounts) => {
    deployer.deploy(SampleDetailedERC20, accounts[1],
        new BigNumber(10).pow(18).multipliedBy(525).toString(10), 18, 'SAMPLE', 'SMP');
    deployer.deploy(SamplePlainERC20, accounts[1],
        new BigNumber(10).pow(18).multipliedBy(525).toString(10));
    deployer.deploy(SampleERC721);
};
