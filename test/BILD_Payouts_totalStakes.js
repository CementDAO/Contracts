const BILD = artifacts.require('./BILD.sol');
const Whitelist = artifacts.require('./Whitelist.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    let whitelist;
    const bildDecimals = 18;
    const owner = accounts[0];
    const distributor = accounts[1];
    const governor = accounts[2];
    const stakeholder1 = accounts[3];
    const stakeholder2 = accounts[4];
    let oneBILDToken;
    let twoBILDTokens;
    let manyBILDTokens;

    before(async () => {
        bild = await BILD.deployed();
        whitelist = await Whitelist.deployed();
        oneBILDToken = new BigNumber(tokenNumber(bildDecimals, 1));
        twoBILDTokens = tokenNumber(bildDecimals, 2);
        manyBILDTokens = tokenNumber(bildDecimals, 100);
    });

    describe('totalStakes', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);

            await whitelist.addGovernor(governor, {
                from: owner,
            });
            await whitelist.addStakeholder(stakeholder1, {
                from: governor,
            });
            await whitelist.addStakeholder(stakeholder2, {
                from: governor,
            });

            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );
            await bild.transfer(
                stakeholder2,
                manyBILDTokens,
                { from: distributor },
            );

            for (let i = 10; i < 20; i += 1) {
                // eslint-disable-next-line no-await-in-loop
                await bild.nominateAgent(
                    `0x2191ef87e392377ec08e7c08eb105ef5448ece${i}`,
                    oneBILDToken,
                    `agent${i}`,
                    `contact${i}`,
                    {
                        from: stakeholder1,
                    },
                );
            }
            for (let i = 10; i < 20; i += 1) {
                // eslint-disable-next-line no-await-in-loop
                await bild.createStake(
                    `0x2191ef87e392377ec08e7c08eb105ef5448ece${i}`,
                    twoBILDTokens,
                    {
                        from: stakeholder2,
                    },
                );
            }
        });
        it('Aggregated stakes for zero agents', async () => {
            const stakes = new BigNumber(await bild.totalStakes(0));
            stakes.should.be.bignumber.equal(0);
        });
        it('Aggregated stakes for one agent', async () => {
            const stakes = new BigNumber(await bild.totalStakes(1));
            stakes.should.be.bignumber.equal(oneBILDToken.multipliedBy(3));
        });
        it('Aggregated stakes for 10 agents', async () => {
            const stakes = new BigNumber(await bild.totalStakes(10));
            stakes.should.be.bignumber.equal(oneBILDToken.multipliedBy(30));
        });
    });
});
