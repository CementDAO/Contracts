const Whitelist = artifacts.require('./Whitelist.sol');
const BILDGovernance = artifacts.require('./BILDGovernance.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow } = require('./utils');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD governance', (accounts) => {
    let whitelist;
    let bildGovernance;
    const owner = accounts[0];
    const governor = accounts[1];
    const MIXRContract = accounts[3];
    const user = accounts[4];

    before(async () => {
        bildGovernance = await BILDGovernance.deployed();
        whitelist = await Whitelist.deployed();
    });

    describe('setting the minimum stake for nominating agents', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bildGovernance = await BILDGovernance.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
        });

        itShouldThrow(
            'regular users can\'t set the minimum stake for nominating agents.',
            async () => {
                await bildGovernance.setMinimumStake(
                    1,
                    { from: user },
                );
            },
            'Not allowed.',
        );

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
            bildGovernance = await BILDGovernance.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
        });

        itShouldThrow(
            'regular users can\'t set the MIXR Contract address.',
            async () => {
                await bildGovernance.setMIXRContract(
                    MIXRContract,
                    { from: user },
                );
            },
            'revert',
        );

        it('the contract owner can set the address for the MIXR contract.', async () => {
            await bildGovernance.setMIXRContract(
                MIXRContract,
                { from: owner },
            );
            const result = await bildGovernance.getMIXRContract();
            assert.equal(result, MIXRContract, 'Addresses don\'t match');
        });
    });
});
