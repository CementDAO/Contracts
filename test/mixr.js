const MIXR = artifacts.require('./MIXR.sol');
const NEOToken = artifacts.require('./NEOToken.sol');
const ERC20 = artifacts.require('./test/ERC20.sol');

const BigNumber = require('bignumber.js');

contract('MIXR', accounts => {
    let MIXRInstance;
    let NEOTokenInstance;
    const userWhitelist = accounts[1];

    before(async () => {
        /**
         * At this point, the MIXR and ERC20 are deployed.
         * The NEOToken is deployed only to get the contract address.
         */
        MIXRInstance = await MIXR.deployed();
        await ERC20.deployed();
        const instance = await NEOToken.deployed();
        NEOTokenInstance = await ERC20.at(instance.address);
    });

    it('add user to whitelist', async () => {
        await MIXRInstance.addToWhiteList(userWhitelist, { from: accounts[0] });
    });
    
    it('should add erc20', async () => {
        await MIXRInstance.addToApprovedTokens(NEOTokenInstance.address, { from: userWhitelist });
    });
    
    it('should deposit erc20', async () => {
        const valueChange = '0.01';
        const one = web3.utils.toWei(valueChange, 'ether');
        const oneBg = new BigNumber(web3.utils.toWei(valueChange, 'ether'));
        const previousNeoBalance = new BigNumber(await NEOTokenInstance.balanceOf(userWhitelist));
        const previousMixrBalance = new BigNumber(await MIXRInstance.balanceOf(userWhitelist));
        await NEOTokenInstance.approve(MIXRInstance.address, one, { from: userWhitelist });
        await MIXRInstance.depositToken(NEOTokenInstance.address, one, { from: userWhitelist });
        const newNeoBalance = new BigNumber(await NEOTokenInstance.balanceOf(userWhitelist));
        const newMixrBalance = new BigNumber(await MIXRInstance.balanceOf(userWhitelist));
        assert.equal(previousNeoBalance.minus(newNeoBalance).s, oneBg.s, 'should have less one neo');
        assert.equal(newMixrBalance.minus(previousMixrBalance).s, oneBg.s, 'should have one more mixr');
    });

});