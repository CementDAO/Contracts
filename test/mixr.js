const MIXR = artifacts.require('./MIXR.sol');
const NEOToken = artifacts.require('./test/NEOToken.sol');
const KittyToken = artifacts.require('./test/KittyToken.sol');

const BigNumber = require('bignumber.js');

contract('MIXR', (accounts) => {
    let MIXRInstance;
    let NEOTokenInstance;
    let KittyTokenInstance;
    const userWhitelist = accounts[1];
    /**
     * In truffle, accounts[0] is the default account,
     * which is the one used to deploy the contracts.
     * The account that deploy the contracts is the owner account.
     */
    const accountOwner = accounts[0];

    before(async () => {
        MIXRInstance = await MIXR.deployed();
        NEOTokenInstance = await NEOToken.deployed();
        KittyTokenInstance = await KittyToken.deployed();
        /**
         * An altenative to this would be to deploy ERC20 and then
         * get the contract instance using the address.
         *
         * await ERC20.deployed();
         * const instance = await NEOToken.deployed();
         * NEOTokenInstance = await ERC20.at(instance.address);
         */
    });
    beforeEach(async () => {
        await MIXRInstance.addToWhiteList(userWhitelist, { from: accountOwner });
    });
    afterEach(async () => {
        await MIXRInstance.removeFromWhiteList(userWhitelist, { from: accountOwner });
    });

    describe('add and remove from whitelist', () => {
        before(async () => {
            await MIXRInstance.removeFromWhiteList(userWhitelist, { from: accountOwner });
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
        it('add user using owner', async () => {
            await MIXRInstance.addToWhiteList(userWhitelist, { from: accountOwner });
        });
        it('remove user using owner', async () => {
            await MIXRInstance.removeFromWhiteList(userWhitelist, { from: accountOwner });
        });
    });
    describe('add and remove erc20 to approved', () => {
        it('add erc20 to approved from whitelist user', async () => {
            await MIXRInstance.addToApprovedTokens(NEOTokenInstance.address,
                { from: userWhitelist });
        });
        it('add non erc20 to approved from whitelist user', async () => {
            try {
                await MIXRInstance.addToApprovedTokens(KittyToken.address,
                    { from: userWhitelist });
                throw new Error('The test \'add erc20 to approved '
                    + 'from non whitelist user\' isn\'t failing.');
            } catch (e) {
                if (e.message.indexOf('revert') < 0) {
                    throw new Error(e);
                } else {
                    const reason = e.message.match('Reason given: (.*)\\.');
                    assert.equal('User not allowed!', reason[1], 'Reason should be \'User not allowed!\'');
                }
            }
        });
        it('add erc20 to approved from non whitelist user', async () => {
            try {
                await MIXRInstance.addToApprovedTokens(NEOTokenInstance.address,
                    { from: accounts[2] });
                throw new Error('The test \'add erc20 to approved '
                    + 'from non whitelist user\' isn\'t failing.');
            } catch (e) {
                if (e.message.indexOf('revert') < 0) {
                    throw new Error(e);
                } else {
                    const reason = e.message.match('Reason given: (.*)\\.');
                    assert.equal('User not allowed!', reason[1], 'Reason should be \'User not allowed!\'');
                }
            }
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
