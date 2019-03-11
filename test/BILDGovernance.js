const Whitelist = artifacts.require('./Whitelist.sol');
const BILDGovernance = artifacts.require('./BILDGovernance.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD governance', (accounts) => {
    let whitelist;
    let bildGovernance;
    const owner = accounts[0];
    const governor = accounts[1];
    const distributor = accounts[2];
    const MIXRContract = accounts[3];

    before(async () => {
        bildGovernance = await BILDGovernance.deployed();
        whitelist = await Whitelist.deployed();
    });

    describe('setting the minimum stake for nominating agents', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bildGovernance = await BILDGovernance.new(distributor, whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
        });
        it('a governor can set the minimum stake for nominating agents.', async () => {
            await bildGovernance.setMinimumStake(
                1,
                { from: governor },
            );
            const result = new BigNumber(await bildGovernance.getMinimumStake());
            result.should.be.bignumber.equal(1);
        });
    });

    describe('setting the MIXR contract address', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bildGovernance = await BILDGovernance.new(distributor, whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
        });
        it('a governor can set the address for the MIXR contract.', async () => {
            await bildGovernance.setMIXRContract(
                MIXRContract,
                { from: governor },
            );
            const result = await bildGovernance.getMIXRContract();
            assert.equal(result, MIXRContract, 'Addresses don\'t match');
        });
    });
});