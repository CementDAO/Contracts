const Whitelist = artifacts.require('./Whitelist.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let whitelist;
    const owner = accounts[0];
    const governor = accounts[2];
    const stakeholder = accounts[3];
    const nonStakeholder = accounts[4];

    before(async () => {
        whitelist = await Whitelist.deployed();
    });

    describe('Governors', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
        });

        itShouldThrow(
            'General users can\'t add governors.',
            async () => {    
                await whitelist.addGovernor(governor, {
                    from: nonStakeholder,
                });
            },
            'revert',
        );

        it('The contract owner can add governors.', async () => {
            assert.equal(await whitelist.isGovernor(governor), false);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
            assert.equal(await whitelist.isGovernor(governor), true);
        });

        itShouldThrow(
            'General users can\'t remove governors.',
            async () => {    
                assert.equal(await whitelist.isGovernor(governor), false);
                await whitelist.addGovernor(governor, {
                    from: owner,
                });
                assert.equal(await whitelist.isGovernor(governor), true);
                await whitelist.removeGovernor(governor, {
                    from: nonStakeholder,
                });
            },
            'revert',
        );

        it('The contract owner can remove governors.', async () => {
            assert.equal(await whitelist.isGovernor(governor), false);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
            assert.equal(await whitelist.isGovernor(governor), true);
            await whitelist.removeGovernor(governor, {
                from: owner,
            });
            assert.equal(await whitelist.isGovernor(governor), false);
        });
    });

    describe('Stakeholders', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            await whitelist.addGovernor(governor, {
                from: owner,
            });
        });

        itShouldThrow(
            'General users can\'t add stakeholders.',
            async () => {    
                await whitelist.addStakeholder(stakeholder, {
                    from: nonStakeholder,
                });
            },
            'Not allowed.',
        );

        it('Governors can add stakeholders.', async () => {
            assert.equal(await whitelist.isStakeholder(stakeholder), false);
            await whitelist.addStakeholder(stakeholder, {
                from: governor,
            });
            assert.equal(await whitelist.isStakeholder(stakeholder), true);
        });

        itShouldThrow(
            'General users can\'t remove stakeholders.',
            async () => {    
                assert.equal(await whitelist.isStakeholder(stakeholder), false);
                await whitelist.addStakeholder(stakeholder, {
                    from: governor,
                });
                assert.equal(await whitelist.isStakeholder(stakeholder), true);
                await whitelist.removeStakeholder(stakeholder, {
                    from: nonStakeholder,
                });
            },
            'Not allowed.',
        );

        it('Governors can remove stakeholders.', async () => {
            assert.equal(await whitelist.isStakeholder(stakeholder), false);
            await whitelist.addStakeholder(stakeholder, {
                from: governor,
            });
            assert.equal(await whitelist.isStakeholder(stakeholder), true);
            await whitelist.removeStakeholder(stakeholder, {
                from: governor,
            });
            assert.equal(await whitelist.isStakeholder(stakeholder), false);
        });
    });
});
