const BILD = artifacts.require('./BILDTest.sol');
const MIXR = artifacts.require('./MIXR.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const Fees = artifacts.require('./Fees.sol');
const SampleDetailedERC20 = artifacts.require('./test/SampleDetailedERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    let mixr;
    let whitelist;
    let fees;

    const owner = accounts[0];
    const distributor = accounts[1];
    const governor = accounts[2];
    const stakeholder1 = accounts[3];
    const stakeholder2 = accounts[4];
    const stakeholder3 = accounts[5];
    const agent1 = accounts[6];
    const agent2 = accounts[7];
    const mixrUser = accounts[8];

    let sampleDetailedERC20;

    const bildDecimals = 18;
    const sampleDecimals = 18;
    const mixDecimals = 24;
    let oneBILDToken;
    let oneMIXToken;
    let manyBILDTokens;
    let manyMIXTokens;
    let manySampleTokens;

    const fixed01 = new BigNumber(10).pow(23).toString(10);
    const fixed1 = new BigNumber(10).pow(24).toString(10);

    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        bild = await BILD.deployed();
        mixr = await MIXR.deployed();
        whitelist = await Whitelist.deployed();

        sampleDetailedERC20 = await SampleDetailedERC20.deployed();

        oneBILDToken = new BigNumber(tokenNumber(bildDecimals, 1));
        oneMIXToken = new BigNumber(tokenNumber(mixDecimals, 1));
        manyBILDTokens = new BigNumber(tokenNumber(bildDecimals, 400));
        manyMIXTokens = new BigNumber(tokenNumber(mixDecimals, 400));
        manySampleTokens = new BigNumber(tokenNumber(sampleDecimals, 400));

        fees = await Fees.deployed(); // TODO: Is this how the frontend does it?
        DEPOSIT = await fees.DEPOSIT();
        REDEMPTION = await fees.REDEMPTION();
    });

    describe('payFeesForAgent', () => {
        beforeEach(async () => {
            // Initialize and link contracts
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);
            mixr = await MIXR.new(whitelist.address, fees.address);
            await bild.setMIXRContract(mixr.address, { from: owner });
            await mixr.setBILDContract(bild.address, { from: owner });

            // Setup governance
            await whitelist.addGovernor(governor, {
                from: owner,
            });
            await whitelist.addStakeholder(stakeholder1, {
                from: governor,
            });
            await whitelist.addStakeholder(stakeholder2, {
                from: governor,
            });
            await whitelist.addStakeholder(stakeholder3, {
                from: governor,
            });

            // Register and setup Sample tokens in MIXR
            sampleDetailedERC20 = await SampleDetailedERC20.new(
                distributor,
                manySampleTokens.toString(10),
                sampleDecimals,
                'SAMPLE',
                'SMP',
            );
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            await mixr.setTokensTargetProportion(
                [sampleDetailedERC20.address],
                [fixed1],
                {
                    from: governor,
                },
            );
            const baseFee = fixed01;
            await mixr.setBaseFee(
                baseFee,
                DEPOSIT,
                {
                    from: governor,
                },
            );
            await mixr.setBaseFee(
                baseFee,
                REDEMPTION,
                {
                    from: governor,
                },
            );

            // Give Sample tokens to MIXR user
            await sampleDetailedERC20.transfer(
                mixrUser,
                manySampleTokens.toString(10),
                { from: distributor },
            );

            // Give BILD tokens to stakeholders
            await bild.transfer(
                stakeholder1,
                manyBILDTokens.toString(10),
                { from: distributor },
            );
            await bild.transfer(
                stakeholder2,
                manyBILDTokens.toString(10),
                { from: distributor },
            );
            await bild.transfer(
                stakeholder3,
                manyBILDTokens.toString(10),
                { from: distributor },
            );

            // Stakeholder1, 2 and 3 stake for agent 1
            await bild.nominateAgent(
                agent1,
                oneBILDToken.multipliedBy(2).toString(10),
                'agent1',
                'contact1',
                {
                    from: stakeholder1,
                },
            );

            await bild.createStake(
                agent1,
                oneBILDToken.multipliedBy(3).toString(10),
                {
                    from: stakeholder2,
                },
            );
            await bild.createStake(
                agent1,
                oneBILDToken.multipliedBy(5).toString(10),
                {
                    from: stakeholder3,
                },
            );

            // Stakeholder1 stakes for agent 2
            await bild.nominateAgent(
                agent2,
                oneBILDToken.multipliedBy(10).toString(10),
                'agent2',
                'contact2',
                {
                    from: stakeholder1,
                },
            );

            // MIX tokens will go to mixrUser and the BILD contract, Sample tokens will go to the MIXR contract
            await mixr.approve(mixr.address, manyMIXTokens.toString(10), {
                from: mixrUser,
            });
            await sampleDetailedERC20.approve(mixr.address, manySampleTokens.toString(10), {
                from: mixrUser,
            });
            await mixr.approve(bild.address, manyMIXTokens.toString(10), {
                from: mixrUser,
            });
            // This should mean 40 sample tokens go as fees to the BILD contract
            await mixr.depositToken(sampleDetailedERC20.address, manySampleTokens.toString(10), {
                from: mixrUser,
            });
        });
        it('All fees paid to one stakeholder and one agent', async () => {
            await bild.testPayFeesForAgent(
                oneMIXToken.multipliedBy(40).toString(10),
                agent2,
                {
                    from: mixrUser,
                },
            );
            // paidFees.should.be.bignumber.equal(oneMIXToken.multipliedBy(40).toString(10));
            const balanceAgent = new BigNumber(await mixr.balanceOf(agent2));
            balanceAgent.should.be.bignumber.equal(oneMIXToken.multipliedBy(20).toString(10));
            const balanceStakeholder = new BigNumber(await mixr.balanceOf(stakeholder1));
            balanceStakeholder.should.be.bignumber.equal(oneMIXToken.multipliedBy(20).toString(10));
            const balanceBILD = new BigNumber(await mixr.balanceOf(bild.address));
            balanceBILD.should.be.bignumber.equal(0);
        });
        it('All fees distributed between stakeholders and one agent', async () => {
            await bild.testPayFeesForAgent(
                oneMIXToken.multipliedBy(40).toString(10),
                agent1,
                {
                    from: mixrUser,
                },
            );
            // paidFees.should.be.bignumber.equal(new BigNumber(oneMIXToken.multipliedBy(40).toString(10)));
            const balanceAgent = new BigNumber(await mixr.balanceOf(agent1));
            balanceAgent.should.be.bignumber.equal(oneMIXToken.multipliedBy(20).toString(10));

            const balanceStakeholder1 = new BigNumber(await mixr.balanceOf(stakeholder1));
            balanceStakeholder1.should.be.bignumber.equal(oneMIXToken.multipliedBy(4).toString(10));

            const balanceStakeholder2 = new BigNumber(await mixr.balanceOf(stakeholder2));
            balanceStakeholder2.should.be.bignumber.equal(oneMIXToken.multipliedBy(6).toString(10));

            const balanceStakeholder3 = new BigNumber(await mixr.balanceOf(stakeholder3));
            balanceStakeholder3.should.be.bignumber.equal(oneMIXToken.multipliedBy(10).toString(10));

            const balanceBILD = new BigNumber(await mixr.balanceOf(bild.address));
            balanceBILD.should.be.bignumber.equal(0);
        });
        it('All fees distributed between all stakeholders and all agents', async () => {
            await bild.testPayoutFees(
                {
                    from: mixrUser,
                },
            );
            // paidFees.should.be.bignumber.equal(new BigNumber(oneMIXToken.multipliedBy(40).toString(10)));

            const balanceAgent1 = new BigNumber(await mixr.balanceOf(agent1));
            balanceAgent1.should.be.bignumber.equal(oneMIXToken.multipliedBy(10).toString(10));

            const balanceAgent2 = new BigNumber(await mixr.balanceOf(agent2));
            balanceAgent2.should.be.bignumber.equal(oneMIXToken.multipliedBy(10).toString(10));

            const balanceStakeholder1 = new BigNumber(await mixr.balanceOf(stakeholder1));
            balanceStakeholder1.should.be.bignumber.equal(oneMIXToken.multipliedBy(12).toString(10));

            const balanceStakeholder2 = new BigNumber(await mixr.balanceOf(stakeholder2));
            balanceStakeholder2.should.be.bignumber.equal(oneMIXToken.multipliedBy(3).toString(10));

            const balanceStakeholder3 = new BigNumber(await mixr.balanceOf(stakeholder3));
            balanceStakeholder3.should.be.bignumber.equal(oneMIXToken.multipliedBy(5).toString(10));

            const balanceBILD = new BigNumber(await mixr.balanceOf(bild.address));
            balanceBILD.should.be.bignumber.equal(0);
        });
    });
});
