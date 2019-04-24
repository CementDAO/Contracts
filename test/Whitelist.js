const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');

ZWeb3.initialize(web3.currentProvider);

const Whitelist = Contracts.getFromLocal('Whitelist');
const { itShouldThrow } = require('./utils');

require('chai').should();

contract('Whitelist', (accounts) => {
    let whitelist;
    const owner = accounts[0];
    const governor = accounts[2];
    const stakeholder = accounts[3];
    const nonStakeholder = accounts[4];

    beforeEach(async () => {
        this.project = await TestHelper();
    });

    describe('Governors', () => {
        beforeEach(async () => {
            whitelist = await this.project.createProxy(Whitelist);
            await whitelist.methods.initialize(owner).send({ from: owner });
        });

        itShouldThrow(
            'General users can\'t add governors.',
            async () => {
                await whitelist.methods.addGovernor(governor).send({
                    from: nonStakeholder,
                });
            },
            'revert',
        );

        it('The contract owner can add governors.', async () => {
            assert.equal(await whitelist.methods.isGovernor(governor).call(), false);
            await whitelist.methods.addGovernor(governor).send({ from: owner });
            assert.equal(await whitelist.methods.isGovernor(governor).call(), true);
        });

        itShouldThrow(
            'General users can\'t remove governors.',
            async () => {
                assert.equal(await whitelist.methods.isGovernor(governor).call(), false);
                await whitelist.methods.addGovernor(governor).send({ from: owner });
                assert.equal(await whitelist.methods.isGovernor(governor).call(), true);
                await whitelist.methods.removeGovernor(governor).send({ from: nonStakeholder });
            },
            'revert',
        );

        it('The contract owner can remove governors.', async () => {
            assert.equal(await whitelist.methods.isGovernor(governor).call(), false);
            await whitelist.methods.addGovernor(governor).send({ from: owner });
            assert.equal(await whitelist.methods.isGovernor(governor).call(), true);
            await whitelist.methods.removeGovernor(governor).send({ from: owner });
            assert.equal(await whitelist.methods.isGovernor(governor).call(), false);
        });
    });

    describe('Stakeholders', () => {
        beforeEach(async () => {
            whitelist = await this.project.createProxy(Whitelist);
            await whitelist.methods.initialize(owner).send({ from: owner });
            await whitelist.methods.addGovernor(governor).send({ from: owner });
        });

        itShouldThrow(
            'General users can\'t add stakeholders.',
            async () => {
                await whitelist.methods.addStakeholder(stakeholder).send({ from: nonStakeholder });
            },
            'Not allowed.',
        );

        it('Governors can add stakeholders.', async () => {
            assert.equal(await whitelist.methods.isStakeholder(stakeholder).call(), false);
            await whitelist.methods.addStakeholder(stakeholder).send({ from: governor });
            assert.equal(await whitelist.methods.isStakeholder(stakeholder).call(), true);
        });

        itShouldThrow(
            'General users can\'t remove stakeholders.',
            async () => {
                assert.equal(await whitelist.methods.isStakeholder(stakeholder).call(), false);
                await whitelist.methods.addStakeholder(stakeholder).send({ from: governor });
                assert.equal(await whitelist.methods.isStakeholder(stakeholder).call(), true);
                await whitelist.methods.removeStakeholder(stakeholder).send({ from: nonStakeholder });
            },
            'Not allowed.',
        );

        it('Governors can remove stakeholders.', async () => {
            assert.equal(await whitelist.methods.isStakeholder(stakeholder).call(), false);
            await whitelist.methods.addStakeholder(stakeholder).send({ from: governor });
            assert.equal(await whitelist.methods.isStakeholder(stakeholder).call(), true);
            await whitelist.methods.removeStakeholder(stakeholder).send({ from: governor });
            assert.equal(await whitelist.methods.isStakeholder(stakeholder).call(), false);
        });
    });
});
