const MIXR = artifacts.require('./MIXR.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const FeesMock = artifacts.require('./FeesMock.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const UtilsLibMock = artifacts.require('./UtilsLibMock.sol');
const SampleDetailedERC20 = artifacts.require('./test/SampleDetailedERC20.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');

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
    let sampleDetailedERC20;
    let sampleDetailedERC20Other;
    const sampleERC20Decimals = 18;
    const sampleERC20DecimalsOther = 20;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];

    before(async () => {
        mixr = await MIXR.deployed();
        whitelist = await Whitelist.deployed();
        feesMock = await FeesMock.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        sampleDetailedERC20 = await SampleDetailedERC20.deployed();
        sampleDetailedERC20Other = await SampleDetailedERC20.deployed();
        someERC721 = await SampleERC721.deployed();
        fixed1 = new BigNumber(await fixidityLibMock.fixed1());
        DEPOSIT = await feesMock.DEPOSIT();
        REDEMPTION = await feesMock.REDEMPTION();
    });

    describe('basketBalance', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });

            sampleDetailedERC20 = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20Decimals, 100),
                sampleERC20Decimals,
                'SAMPLE',
                'SMP',
            );
            sampleDetailedERC20Other = await SampleDetailedERC20.new(
                governor,
                tokenNumber(sampleERC20DecimalsOther, 100),
                sampleERC20DecimalsOther,
                'COMPLEX',
                'CLP',
            );

            /**
             * approve tokens!
             */
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            await mixr.registerDetailedToken(sampleDetailedERC20Other.address, {
                from: governor,
            });

            /**
             * give some to user for test purposes
             */
            await sampleDetailedERC20.transfer(user,
                tokenNumber(sampleERC20Decimals, 90), { from: governor });
            await sampleDetailedERC20Other.transfer(user,
                tokenNumber(sampleERC20DecimalsOther, 80), { from: governor });
        });
        it('basketBalance() = 0 before introducing any tokens', async () => {
            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(0);
        });
        it('basketBalance() = (10**24) after introducing 1 token of x type', async () => {
            /**
             * Introduce one token
             */
            await sampleDetailedERC20.transfer(mixr.address,
                tokenNumber(sampleERC20Decimals, 1), { from: user });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(24));
        });
        it('Test basketBalance() = 2*(10**24) after introducing 1 token of x type', async () => {
            /**
             * Introduce one token twice
             */
            await sampleDetailedERC20.transfer(mixr.address,
                tokenNumber(sampleERC20Decimals, 1), { from: user });
            await sampleDetailedERC20.transfer(mixr.address,
                tokenNumber(sampleERC20Decimals, 1), { from: user });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(24).multipliedBy(2));
        });
        it('Test basketBalance() = 3*(10**24) after introducing 1 token of y type', async () => {
            /**
             * Introduce one token twice and another token once
             */
            await sampleDetailedERC20.transfer(mixr.address,
                tokenNumber(sampleERC20Decimals, 1), { from: user });
            await sampleDetailedERC20.transfer(mixr.address,
                tokenNumber(sampleERC20Decimals, 1), { from: user });
            await sampleDetailedERC20Other.transfer(mixr.address,
                tokenNumber(sampleERC20DecimalsOther, 1), { from: user });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(24).multipliedBy(3));
        });
        it('Test basketBalance() = (10**6) after introducing 1 wei of x type', async () => {
            /**
             * Introduce one wei of x
             */
            await sampleDetailedERC20.transfer(mixr.address, 1, { from: user });

            const converted = new BigNumber(
                await mixr.basketBalance(),
            );
            converted.should.be.bignumber.equal(new BigNumber(10).pow(6));
        });
        it('Test basketBalance() = (10**6)+(10**4) after introducing 1 token of y type', async () => {
            /**
             * Introduce one wei of x and one wei of y
             */
            await sampleDetailedERC20.transfer(mixr.address, 1, { from: user });
            await sampleDetailedERC20Other.transfer(mixr.address, 1, { from: user });

            const result = new BigNumber(
                await mixr.basketBalance(),
            );
            result.should.be.bignumber.equal(
                new BigNumber(10).pow(4).plus(new BigNumber(10).pow(6)),
            );
        });
    });
});
