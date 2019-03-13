const MIXR = artifacts.require('./MIXR.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const FeesMock = artifacts.require('./FeesMock.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const ContractSampleERC20 = artifacts.require('./test/SampleDetailedERC20.sol');
const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();


contract('MIXR', (accounts) => {
    let mixr;
    let whitelist;
    let feesMock;
    let fixidityLibMock;
    let ERC20Sample;
    let ERC20Complex;
    let ERC20Rare;
    let ERC20Cosmic;
    let ERC20Galactic;

    // set accounts
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    const stakeholders = accounts[3];

    // set some variables
    const mixrDecimals = 24;
    const sampleERC20Decimals = 18;

    let fixed1;
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        whitelist = await Whitelist.deployed();
        feesMock = await FeesMock.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        ERC20Sample = await ContractSampleERC20.deployed();

        ERC20Sample = await ContractSampleERC20.new(
            governor,
            tokenNumber(sampleERC20Decimals, 100),
            sampleERC20Decimals,
            'SAMPLE',
            'SMP',
        );
        ERC20Complex = await ContractSampleERC20.new(
            accounts[1],
            new BigNumber(10).pow(18).multipliedBy(525).toString(10),
            18,
            'COMPLEX',
            'CLP',
            { from: governor },
        );
        ERC20Rare = await ContractSampleERC20.new(
            accounts[1],
            new BigNumber(10).pow(18).multipliedBy(525).toString(10),
            18,
            'RARE',
            'RR',
            { from: governor },
        );
        ERC20Cosmic = await ContractSampleERC20.new(
            accounts[1],
            new BigNumber(10).pow(18).multipliedBy(525).toString(10),
            18,
            'COSMIC',
            'CC',
            { from: governor },
        );
        ERC20Galactic = await ContractSampleERC20.new(
            accounts[1],
            new BigNumber(10).pow(18).multipliedBy(525).toString(10),
            18,
            'GALACTIC',
            'GLC',
            { from: governor },
        );

        fixed1 = new BigNumber(await fixidityLibMock.fixed1());
        DEPOSIT = await feesMock.DEPOSIT();
        REDEMPTION = await feesMock.REDEMPTION();

        /**
         * send tokens to user to use in tests
         */
        await ERC20Sample.transfer(
            user,
            tokenNumber(sampleERC20Decimals, 100),
            { from: governor },
        );
        await ERC20Complex.transfer(user, tokenNumber(sampleERC20Decimals, 100), { from: governor });
    });

    describe('deposit functionality', () => {
        beforeEach(async () => {
            /**
             * deploy mixr and sample erc20
             */
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
            await mixr.setStakeholderAccount(stakeholders, { from: governor });

            // define amounts
            const tokensDeposit = 5;
            const tokensToDeposit = tokenNumber(sampleERC20Decimals, tokensDeposit);
            const MIXToMint = new BigNumber(10).pow(mixrDecimals).multipliedBy(tokensDeposit);

            /**
             * Setup first token
             */
            await mixr.registerDetailedToken(ERC20Sample.address, {
                from: governor,
            });
            await mixr.setTokensTargetProportion(
                [ERC20Sample.address],
                [fixed1.toString(10)],
                {
                    from: governor,
                },
            );
            /**
             * set base fee
             */
            let baseFee = new BigNumber(await fixidityLibMock.newFixedFraction(1, 100)).toString(10);
            await mixr.setTransactionFee(
                ERC20Sample.address,
                baseFee,
                DEPOSIT,
                {
                    from: governor,
                },
            );
            await mixr.setTransactionFee(
                ERC20Sample.address,
                baseFee,
                REDEMPTION,
                {
                    from: governor,
                },
            );
            
            // approve and deposit
            await mixr.approve(mixr.address, MIXToMint.toString(10), { from: user });
            await ERC20Sample.approve(mixr.address, tokensToDeposit.toString(10), { from: user });
            await mixr.depositToken(ERC20Sample.address, tokensToDeposit.toString(10), { from: user });

            // add second token
            await mixr.registerStandardToken(ERC20Complex.address, web3.utils.utf8ToHex('COMPLEX'), 18, { from: governor });
            await mixr.setTokensTargetProportion(
                [
                    ERC20Sample.address,
                    ERC20Complex.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                ],
                { from: governor },
            );
            //
            baseFee = new BigNumber(await fixidityLibMock.newFixedFraction(1, 100)).toString(10);
            await mixr.setTransactionFee(ERC20Complex.address, baseFee, DEPOSIT, { from: governor });
            await mixr.setTransactionFee(ERC20Complex.address, baseFee, REDEMPTION, { from: governor });
            //
            
            // approve and deposit
            await mixr.approve(mixr.address, MIXToMint.toString(10), { from: user });
            await ERC20Complex.approve(mixr.address, tokensToDeposit.toString(10), { from: user });
            await mixr.depositToken(ERC20Complex.address, tokensToDeposit.toString(10), { from: user });


            // add third token
            await mixr.registerStandardToken(ERC20Rare.address, web3.utils.utf8ToHex('RARE'), 18, { from: governor });
            await mixr.setTokensTargetProportion(
                [
                    ERC20Sample.address,
                    ERC20Complex.address,
                    ERC20Rare.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(2, 4)).toString(10),
                ],
                { from: governor },
            );
            //
            baseFee = new BigNumber(10).pow(23).toString(10);
            await mixr.setTransactionFee(ERC20Rare.address, baseFee, DEPOSIT, { from: governor });
            await mixr.setTransactionFee(ERC20Rare.address, baseFee, REDEMPTION, { from: governor });
            //
            await ERC20Rare.transfer(user, tokenNumber(sampleERC20Decimals, 100), { from: governor });
            // approve and deposit
            await mixr.approve(mixr.address, MIXToMint.toString(10), { from: user });
            await ERC20Rare.approve(mixr.address, tokensToDeposit.toString(10), { from: user });
            await mixr.depositToken(ERC20Rare.address, tokensToDeposit.toString(10), { from: user });


            // add fourth token
            await mixr.registerStandardToken(ERC20Cosmic.address, web3.utils.utf8ToHex('COSMIC'), 18, { from: governor });
            await mixr.setTokensTargetProportion(
                [
                    ERC20Sample.address,
                    ERC20Complex.address,
                    ERC20Rare.address,
                    ERC20Cosmic.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
                ],
                { from: governor },
            );
            //
            baseFee = new BigNumber(10).pow(23).toString(10);
            await mixr.setTransactionFee(ERC20Cosmic.address, baseFee, DEPOSIT, { from: governor });
            await mixr.setTransactionFee(ERC20Cosmic.address, baseFee, REDEMPTION, { from: governor });
            //
            await ERC20Cosmic.transfer(user, tokenNumber(sampleERC20Decimals, 100), { from: governor });
            // approve and deposit
            await mixr.approve(mixr.address, MIXToMint.toString(10), { from: user });
            await ERC20Cosmic.approve(mixr.address, tokensToDeposit.toString(10), { from: user });
            await mixr.depositToken(ERC20Cosmic.address, tokensToDeposit.toString(10), { from: user });


            // add fifth token
            await mixr.registerStandardToken(ERC20Galactic.address, web3.utils.utf8ToHex('GALACTIC'), 18, { from: governor });
            await mixr.setTokensTargetProportion(
                [
                    ERC20Sample.address,
                    ERC20Complex.address,
                    ERC20Rare.address,
                    ERC20Cosmic.address,
                    ERC20Galactic.address,
                ],
                [
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 5)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 5)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 5)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 5)).toString(10),
                    new BigNumber(await fixidityLibMock.newFixedFraction(1, 5)).toString(10),
                ],
                { from: governor },
            );
            //
            baseFee = new BigNumber(10).pow(23).toString(10);
            await mixr.setTransactionFee(ERC20Galactic.address, baseFee, DEPOSIT, { from: governor });
            await mixr.setTransactionFee(ERC20Galactic.address, baseFee, REDEMPTION, { from: governor });
            //
            await ERC20Galactic.transfer(user, tokenNumber(sampleERC20Decimals, 100), { from: governor });
            // approve and deposit
            await mixr.approve(mixr.address, MIXToMint.toString(10), { from: user });
            await ERC20Galactic.approve(mixr.address, tokensToDeposit.toString(10), { from: user });
            await mixr.depositToken(ERC20Galactic.address, tokensToDeposit.toString(10), { from: user });
        });

        it('depositToken(15) Galactic', async () => {
            const tokensDeposit = 15;
            const tokensToDeposit = tokenNumber(sampleERC20Decimals, tokensDeposit);
            const MIXToMint = new BigNumber(10).pow(mixrDecimals).multipliedBy(tokensDeposit);
            await mixr.approve(mixr.address, MIXToMint.toString(10), { from: user });
            await ERC20Galactic.approve(mixr.address, tokensToDeposit.toString(10), { from: user });
            await mixr.depositToken(ERC20Galactic.address, tokensToDeposit.toString(10), { from: user });
        });
    });
});