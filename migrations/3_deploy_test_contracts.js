const SampleERC20 = artifacts.require("./test/SampleERC20.sol");
const SampleERC721 = artifacts.require("./test/SampleERC721.sol");

module.exports = (deployer, network, accounts) => {
  deployer.deploy(SampleERC20, accounts[1]);
  deployer.deploy(SampleERC721);
};
