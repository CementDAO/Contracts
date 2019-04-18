const BILD = artifacts.require('./BILD.sol');
const Whitelist = artifacts.require('./Whitelist.sol');

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
    let oneBILDToken;
    let manyBILDTokens;

    before(async () => {
        bild = await BILD.deployed();
        whitelist = await Whitelist.deployed();
        oneBILDToken = tokenNumber(bildDecimals, 1);
        manyBILDTokens = tokenNumber(bildDecimals, 100);
    });

    describe('calculate R', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);

            await whitelist.addGovernor(governor, {
                from: owner,
            });
            await whitelist.addStakeholder(stakeholder1, {
                from: governor,
            });

            await bild.transfer(
                stakeholder1,
                manyBILDTokens,
                { from: distributor },
            );

            for (let i = 0; i < 9; i += 1) {
                // eslint-disable-next-line no-await-in-loop
                await bild.nominateAgent(
                    `0x2191ef87e392377ec08e7c08eb105ef5448eced${i}`,
                    oneBILDToken,
                    `agent${i}`,
                    `contact${i}`,
                    {
                        from: stakeholder1,
                    },
                );
            }
        });
        it('Less agents than R', async () => {
            const R = await bild.calculateR();
            assert.equal(R, 9);
        });
        it('More agents than R', async () => {
            for (let i = 0; i < 2; i += 1) {
                // eslint-disable-next-line no-await-in-loop
                await bild.nominateAgent(
                    `0x2191ef87e392377ec08e7c08eb105ef5448ecee${i}`,
                    oneBILDToken,
                    `agent1${i}`,
                    `contact1${i}`,
                    {
                        from: stakeholder1,
                    },
                );
            }
            const R = await bild.calculateR();
            assert.equal(R, 10);
        });
    });
});
