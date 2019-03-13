const BILD = artifacts.require('./BILD.sol');
const BILDDataTest = artifacts.require('./BILDDataTest.sol');
const Whitelist = artifacts.require('./Whitelist.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    let bildDataTest;
    let whitelist;
    const bildDecimals = 18;
    const owner = accounts[0];
    const distributor = accounts[1];
    const governor = accounts[2];
    const stakeholder1 = accounts[3];
    const stakeholder2 = accounts[4];
    const nonStakeholder = accounts[5];
    const agent1 = accounts[6];
    let oneBILDToken;
    let twoBILDTokens;

    before(async () => {
        bild = await BILD.deployed();
        bildDataTest = await BILDDataTest.deployed();
        whitelist = await Whitelist.deployed();
        oneBILDToken = tokenNumber(bildDecimals, 1);
        twoBILDTokens = tokenNumber(bildDecimals, 2);
    });

    describe('transfer BILD', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
            await whitelist.addStakeholder(stakeholder1, {
                from: governor,
            });
        });

        itShouldThrow(
            'transfers to addresses not in the stakeholders whitelist fail.',
            async () => {    
                await bild.transfer(
                    nonStakeholder,
                    oneBILDToken,
                    { from: distributor },
                );
            },
            'This address is not authorized to hold BILD tokens.',
        );

        it('transfers to addresses in the stakeholders whitelist succeed.', async () => {
            await bild.transfer(
                stakeholder1,
                oneBILDToken,
                { from: distributor },
            );
        });

        itShouldThrow(
            'transfers of more than the unstaked BILD of the sender fail.',
            async () => {
                // Get initial BILD from distributor    
                await bild.transfer(
                    stakeholder1,
                    oneBILDToken,
                    { from: distributor },
                );
                await whitelist.addStakeholder(stakeholder2, {
                    from: governor,
                });
                // Nominate agent
                bild.nominateAgent(
                    agent1,
                    oneBILDToken,
                    'agent1',
                    'contact1',
                    {
                        from: stakeholder1,
                    },
                );

                // Transfer BILD
                await bild.approve(bild.address, oneBILDToken.toString(10), {
                    from: stakeholder1,
                });
                await bild.transferFrom(stakeholder1, stakeholder2, oneBILDToken.toString(10), {
                    from: stakeholder1,
                });
            },
            'Sender doesn\'t have enough unstaked BILD.',
        );

        it('transfers to approved BILD stakeholders under the unstaked BILD balance succeed.', async () => {
            // Get initial BILD from distributor    
            await bild.transfer(
                stakeholder1,
                twoBILDTokens,
                { from: distributor },
            );
            await whitelist.addStakeholder(stakeholder2, {
                from: governor,
            });
            // Nominate agent
            bild.nominateAgent(
                agent1,
                oneBILDToken,
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            // Transfer BILD
            await bild.approve(bild.address, oneBILDToken.toString(10), {
                from: stakeholder1,
            });
            await bild.transferFrom(stakeholder1, stakeholder2, oneBILDToken.toString(10), {
                from: stakeholder1,
            });
        });
    });
});
