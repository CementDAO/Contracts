const MIXR = artifacts.require('./MIXR.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');

const BigNumber = require('bignumber.js');
const { itShouldThrow } = require('./utils');

contract('MIXR deposit/redeem', (accounts) => {
    let mixr;
    let someERC20;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        someERC20 = await SampleERC20.deployed();
    });

    describe('deposit functionality', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            await mixr.addGovernor(governor, {
                from: owner,
            });
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            await mixr.setTokenTargetProportion(someERC20.address, 1, {
                from: governor,
            });
            await someERC20.transfer(user, web3.utils.toWei('1', 'ether'), { from: governor });
            const mixrBalance = new BigNumber(await mixr.totalSupply());
            assert.equal(mixrBalance.comparedTo(new BigNumber(0)), 0, 'should be 0.');
        });
        describe('actions that should fail', () => {
            // todo            
        });
    });


});
