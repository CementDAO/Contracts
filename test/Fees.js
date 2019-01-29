const MIXR = artifacts.require('./MIXR.sol');
const SampleERC20 = artifacts.require('./test/SampleERC20.sol');

const BigNumber = require('bignumber.js');

contract('Fees', (accounts) => {
    let mixr;
    let someERC20;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        someERC20 = await SampleERC20.deployed();
    });

    describe('deposit fee functionality', () => {
        beforeEach(async () => {
            mixr = await MIXR.new();
            someERC20 = await SampleERC20.new(governor);
            await mixr.addGovernor(governor, {
                from: owner,
            });
            await mixr.approveToken(someERC20.address, {
                from: governor,
            });
            await mixr.setTokenTargetProportion(someERC20.address, 1, {
                from: governor,
            });

            const valueChange = '0.01';
            const one = web3.utils.toWei(valueChange, 'ether');
            // to redeem we actually need some funds
            // so we should deposit first
            await someERC20.transfer(user, web3.utils.toWei('1', 'ether'), { from: governor });
            await someERC20.approve(mixr.address, one, {
                from: user,
            });
            await mixr.depositToken(someERC20.address, one, {
                from: user,
            });
        });
        it('verify', async () => {
            const balance = await mixr
                .depositFee(someERC20.address, web3.utils.toWei('0.02', 'ether'));
            console.log(balance);
        });
    });

});
