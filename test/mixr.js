const MIXR = artifacts.require('./MIXR.sol');
const NEOToken = artifacts.require('./test/NEOToken.sol');

const BigNumber = require('bignumber.js');

contract('MIXR', (accounts) => {
    let MIXRInstance;
    let NEOTokenInstance;
    const userWhitelist = accounts[1];

    before(async () => {
        MIXRInstance = await MIXR.deployed();
        NEOTokenInstance = await NEOToken.deployed();
        /**
         * An altenative to this would be to deploy ERC20 and then
         * get the contract instance using the address.
         *
         * await ERC20.deployed();
         * const instance = await NEOToken.deployed();
         * NEOTokenInstance = await ERC20.at(instance.address);
         */
    });

    describe('add and remove from whitelist', () => {
        it('add user not using owner', async () => {
            try {
                await MIXRInstance.addToWhiteList(userWhitelist, { from: accounts[1] });
            } catch (e) {
                //
            }
        });
        it('add user using invalid address', async () => {
            try {
                await MIXRInstance.addToWhiteList(userWhitelist, { from: 0x0 });
            } catch (e) {
                //
            }
        });
        it('add user using owner', async () => {
            await MIXRInstance.addToWhiteList(userWhitelist, { from: accounts[0] });
        });
    });
    describe('add and remove erc20 to approved', () => {
        it('should add erc20 to approved', async () => {
            await MIXRInstance.addToApprovedTokens(NEOTokenInstance.address,
                { from: userWhitelist });
        });
    });
    describe('add and remove erc20 to basket', () => {
        it('should add erc20 to basket', async () => {
            await MIXRInstance.addToBasketTokens(NEOTokenInstance.address,
                1, { from: userWhitelist });
        });
    });
    describe('add and remove erc20 to basket', () => {
        it('should deposit erc20', async () => {
            const valueChange = '0.01';
            const one = web3.utils.toWei(valueChange, 'ether');
            const oneBg = new BigNumber(web3.utils.toWei(valueChange, 'ether'));
            const previousNeoBalance = new BigNumber(
                await NEOTokenInstance.balanceOf(userWhitelist),
            );
            const previousMixrBalance = new BigNumber(
                await MIXRInstance.balanceOf(userWhitelist),
            );
            await NEOTokenInstance.approve(MIXRInstance.address,
                one, { from: userWhitelist });
            await MIXRInstance.depositToken(NEOTokenInstance.address,
                one, { from: userWhitelist });
            const newNeoBalance = new BigNumber(
                await NEOTokenInstance.balanceOf(userWhitelist),
            );
            const newMixrBalance = new BigNumber(
                await MIXRInstance.balanceOf(userWhitelist),
            );
            assert.equal(previousNeoBalance.minus(newNeoBalance).s,
                oneBg.s, 'should have less one neo');
            assert.equal(newMixrBalance.minus(previousMixrBalance).s,
                oneBg.s, 'should have one more mixr');
        });
        it('should redeem erc20', async () => {
            const valueChange = '0.01';
            const one = web3.utils.toWei(valueChange, 'ether');
            const oneBg = new BigNumber(web3.utils.toWei(valueChange, 'ether'));
            const previousNeoBalance = new BigNumber(
                await NEOTokenInstance.balanceOf(userWhitelist),
            );
            const previousMixrBalance = new BigNumber(
                await MIXRInstance.balanceOf(userWhitelist),
            );
            await MIXRInstance.approve(MIXRInstance.address,
                one, { from: userWhitelist });
            await MIXRInstance.redeemToken(NEOTokenInstance.address,
                one, { from: userWhitelist });
            const newNeoBalance = new BigNumber(
                await NEOTokenInstance.balanceOf(userWhitelist),
            );
            const newMixrBalance = new BigNumber(
                await MIXRInstance.balanceOf(userWhitelist),
            );
            assert.equal(newNeoBalance.minus(previousNeoBalance).s,
                oneBg.s, 'should have less one neo');
            assert.equal(previousMixrBalance.minus(newMixrBalance).s,
                oneBg.s, 'should have one more mixr');
        });
    });
});
