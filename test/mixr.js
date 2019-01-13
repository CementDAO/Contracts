const MIXR = artifacts.require("./MIXR.sol");
const SampleERC20 = artifacts.require("./test/SampleERC20.sol");
const SampleERC721 = artifacts.require("./test/SampleERC721.sol");

const BigNumber = require("bignumber.js");

contract("MIXR", accounts => {
  let MIXRInstance;
  let SampleERC20Instance;
  let SampleERC721Instance;
  const userWhitelist = accounts[1];
  /**
   * In truffle, accounts[0] is the default account,
   * which is the one used to deploy the contracts.
   * The account that deploy the contracts is the owner account.
   */
  const accountOwner = accounts[0];

  before(async () => {
    MIXRInstance = await MIXR.deployed();
    SampleERC20Instance = await SampleERC20.deployed();
    SampleERC721Instance = await SampleERC721.deployed();
    /**
     * An altenative to this would be to deploy ERC20 and then
     * get the contract instance using the address.
     *
     * await ERC20.deployed();
     * const instance = await SampleERC20.deployed();
     * SampleERC20Instance = await ERC20.at(instance.address);
     */
  });
  beforeEach(async () => {
    await MIXRInstance.addGovernor(userWhitelist, { from: accountOwner });
  });
  afterEach(async () => {
    await MIXRInstance.removeGovernor(userWhitelist, {
      from: accountOwner
    });
  });

  describe("add and remove from whitelist", () => {
    before(async () => {
      await MIXRInstance.removeGovernor(userWhitelist, {
        from: accountOwner
      });
    });
    /**
     * We could have more tests, for example, using invalid address in *from*
     * field, but that address is checked by web3.js and by the network. So,
     * doesn't make sense be here testing something already tested.
     */
    /**
     * We can also test with some other accounts that are not owners, but
     * this is already tested by open-zeppelin.
     */
    it("add user using owner", async () => {
      await MIXRInstance.addGovernor(userWhitelist, { from: accountOwner });
    });
    it("remove user using owner", async () => {
      await MIXRInstance.removeGovernor(userWhitelist, {
        from: accountOwner
      });
    });
  });
  describe("add and remove erc20 to approved", () => {
    it("add erc20 to approved from whitelist user", async () => {
      await MIXRInstance.approveToken(SampleERC20Instance.address, {
        from: userWhitelist
      });
    });
    it("add erc20 to approved from non whitelist user", async () => {
      try {
        await MIXRInstance.approveToken(SampleERC20Instance.address, {
          from: accounts[2]
        });
        throw new Error(
          "The test 'add erc20 to approved " +
            "from non whitelist user' isn't failing."
        );
      } catch (e) {
        if (e.message.indexOf("revert") < 0) {
          throw new Error(e);
        } else {
          const reason = e.message.match("Reason given: (.*)\\.");
          assert.equal(
            "User not allowed!",
            reason[1],
            "Reason should be 'User not allowed!'"
          );
        }
      }
    });
    it("add non erc20 to approved from whitelist user", async () => {
      try {
        await MIXRInstance.approveToken(SampleERC721Instance.address, {
          from: userWhitelist
        });
        throw new Error(
          "The test 'add non erc20 to approved " +
            "from whitelist user' isn't failing."
        );
      } catch (e) {
        if (e.message.indexOf("revert") < 0) {
          throw new Error(e);
        } else {
          // error when trying to interface
        }
      }
    });
    it("add non contract to approved from whitelist user", async () => {
      try {
        await MIXRInstance.approveToken(accounts[2], {
          from: userWhitelist
        });
        throw new Error(
          "The test 'add non contract to approved " +
            "from whitelist user' isn't failing."
        );
      } catch (e) {
        if (e.message.indexOf("revert") < 0) {
          throw new Error(e);
        } else {
          const reason = e.message.match("Reason given: (.*)\\.");
          assert.equal(
            "Address is not a contract.",
            reason[1],
            "Reason should be 'Address is not a contract.'"
          );
        }
      }
    });
  });
  describe("add and remove erc20 to basket", async () => {
    it("add non approved erc20 to basket", async () => {
      try {
        await MIXRInstance.setTokenTargetProportion(
          SampleERC721Instance.address,
          1,
          {
            from: userWhitelist
          }
        );
        throw new Error(
          "The test 'add non contract to approved " +
            "from whitelist user' isn't failing."
        );
      } catch (e) {
        if (e.message.indexOf("revert") < 0) {
          throw new Error(e);
        } else {
          const reason = e.message.match("Reason given: (.*)\\.");
          assert.equal(
            "Token not approved!",
            reason[1],
            "Reason should be 'Token not approved!'"
          );
        }
      }
    });
    it("add approved erc20 to basket", async () => {
      await MIXRInstance.setTokenTargetProportion(
        SampleERC20Instance.address,
        1,
        {
          from: userWhitelist
        }
      );
    });
  });
  describe("deposit erc20", () => {
    it("deposit valid erc20", async () => {
      const valueChange = "0.01";
      const one = web3.utils.toWei(valueChange, "ether");
      const oneBg = new BigNumber(web3.utils.toWei(valueChange, "ether"));
      const previousERC20Balance = new BigNumber(
        await SampleERC20Instance.balanceOf(userWhitelist)
      );
      const previousMixrBalance = new BigNumber(
        await MIXRInstance.balanceOf(userWhitelist)
      );
      await SampleERC20Instance.approve(MIXRInstance.address, one, {
        from: userWhitelist
      });
      await MIXRInstance.depositToken(SampleERC20Instance.address, one, {
        from: userWhitelist
      });
      const newERC20Balance = new BigNumber(
        await SampleERC20Instance.balanceOf(userWhitelist)
      );
      const newMixrBalance = new BigNumber(
        await MIXRInstance.balanceOf(userWhitelist)
      );
      assert.equal(
        previousERC20Balance.minus(newERC20Balance).s,
        oneBg.s,
        "should have less one ERC20"
      );
      assert.equal(
        newMixrBalance.minus(previousMixrBalance).s,
        oneBg.s,
        "should have one more mixr"
      );
    });
    it("deposit invalid erc20", async () => {
      try {
        const valueChange = "0.01";
        const one = web3.utils.toWei(valueChange, "ether");
        await MIXRInstance.depositToken(SampleERC721Instance.address, one, {
          from: userWhitelist
        });
        throw new Error("The test 'deposit invalid erc20' isn't failing.");
      } catch (e) {
        if (e.message.indexOf("revert") < 0) {
          throw new Error(e);
        } else {
          //
        }
      }
    });
  });
  describe("redeem erc20", () => {
    it("redeem erc20", async () => {
      const valueChange = "0.01";
      const one = web3.utils.toWei(valueChange, "ether");
      const oneBg = new BigNumber(web3.utils.toWei(valueChange, "ether"));
      const previousERC20Balance = new BigNumber(
        await SampleERC20Instance.balanceOf(userWhitelist)
      );
      const previousMixrBalance = new BigNumber(
        await MIXRInstance.balanceOf(userWhitelist)
      );
      await MIXRInstance.approve(MIXRInstance.address, one, {
        from: userWhitelist
      });
      await MIXRInstance.redeemMIXR(SampleERC20Instance.address, one, {
        from: userWhitelist
      });
      const newERC20Balance = new BigNumber(
        await SampleERC20Instance.balanceOf(userWhitelist)
      );
      const newMixrBalance = new BigNumber(
        await MIXRInstance.balanceOf(userWhitelist)
      );
      assert.equal(
        newERC20Balance.minus(previousERC20Balance).s,
        oneBg.s,
        "should have less one ERC20"
      );
      assert.equal(
        previousMixrBalance.minus(newMixrBalance).s,
        oneBg.s,
        "should have one more mixr"
      );
    });
    it("redeem invalid erc20", async () => {
      try {
        const valueChange = "0.01";
        const one = web3.utils.toWei(valueChange, "ether");
        await MIXRInstance.redeemMIXR(SampleERC721Instance.address, one, {
          from: userWhitelist
        });
        throw new Error("The test 'redeem invalid erc20' isn't failing.");
      } catch (e) {
        if (e.message.indexOf("revert") < 0) {
          throw new Error(e);
        } else {
          //
        }
      }
    });
  });
});
