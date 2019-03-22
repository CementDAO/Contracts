const MIXR = artifacts.require('./MIXR.sol');
const Whitelist = artifacts.require('./Whitelist.sol');
const FeesMock = artifacts.require('./FeesMock.sol');
const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');
const SampleERC721 = artifacts.require('./test/SampleERC721.sol');
const SampleDetailedERC20 = artifacts.require('./test/SampleDetailedERC20.sol');
const SamplePlainERC20 = artifacts.require('./test/SamplePlainERC20.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
const { itShouldThrow, tokenNumber } = require('./utils');

// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('MIXR governance', (accounts) => {
    let mixr;
    let whitelist;
    let feesMock;
    let fixidityLibMock;
    let sampleDetailedERC20;
    let sampleDetailedERC20Other;
    let somePlainERC20;
    let someERC721;
    let sampleERC20Decimals;
    let sampleERC20DecimalsOther;
    const owner = accounts[0];
    const governor = accounts[1];
    const user = accounts[2];
    const stakeholders = accounts[3];
    let DEPOSIT;
    let REDEMPTION;

    before(async () => {
        mixr = await MIXR.deployed();
        whitelist = await Whitelist.deployed();
        feesMock = await FeesMock.deployed();
        someERC721 = await SampleERC721.deployed();
        fixidityLibMock = await FixidityLibMock.deployed();
        sampleDetailedERC20 = await SampleDetailedERC20.deployed();
        sampleDetailedERC20Other = await SampleDetailedERC20.deployed();
        somePlainERC20 = await SamplePlainERC20.deployed();
        DEPOSIT = await feesMock.DEPOSIT();
        REDEMPTION = await feesMock.REDEMPTION();
    });

    describe('setting the BILD Contract address', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
        });
        /* itShouldThrow(
            'only valid addresses are allowed as the BILD Contract address.',
            async () => {
                await mixr.setBILDContract(
                    '0x00000000000000000000000000000000',
                    { from: governor },
                );
            },
            'Invalid wallet address!',
        ); */

        itShouldThrow(
            'regular users can\'t set the BILD Contract address.',
            async () => {
                await mixr.setBILDContract(
                    stakeholders,
                    { from: user },
                );
            },
            'revert',
        );

        it('the contract owner can set the BILD Contract address.', async () => {
            await mixr.setBILDContract(
                stakeholders,
                { from: owner },
            );
        });
    });

    describe('token registering', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
        });

        itShouldThrow(
            'forbids non-governors to approve a valid token',
            async () => {
                await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                    from: user,
                });
            },
            'Message sender isn\'t part of the governance whitelist.',
        );

        itShouldThrow(
            'forbids approving a non-valid token',
            async () => {
                await mixr.registerDetailedToken(someERC721.address, {
                    from: governor,
                });
            },
            'revert',
        );

        itShouldThrow(
            'forbids approving a non-contract address',
            async () => {
                await mixr.registerDetailedToken(user, {
                    from: governor,
                });
            },
            'The specified address doesn\'t look like a deployed contract.',
        );

        itShouldThrow(
            'forbids approving an approved token',
            async () => {
                await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                    from: governor,
                });
                await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                    from: governor,
                });
            },
            'Token is already registered!',
        );

        it('allows a governor to approve an ERC20Detailed token', async () => {
            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
        });

        it('allows a governor to approve an ERC20 token', async () => {
            await mixr.registerStandardToken(
                somePlainERC20.address,
                'SAMPLE',
                'SMP',
                18,
                { from: governor },
            );
        });

        itShouldThrow(
            'forbids approving an ERC20 token without decimals',
            async () => {
                await mixr.registerDetailedToken(somePlainERC20.address, {
                    from: governor,
                });
            },
            'revert',
        );
    });

    describe('setting the base fees', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            mixr = await MIXR.new(whitelist.address);
            await whitelist.addGovernor(governor, {
                from: owner,
            });
        });

        itShouldThrow(
            'regular users can\'t set the base fees.',
            async () => {
                await mixr.setBaseFee(
                    new BigNumber(await fixidityLibMock.newFixed(1)).minus(1).toString(10),
                    DEPOSIT,
                    { from: user },
                );
            },
            'Message sender isn\'t part of the governance whitelist.',
        );

        itShouldThrow(
            'base fees cannot be set below the minimumFee.',
            async () => {
                await mixr.setBaseFee(
                    1,
                    DEPOSIT,
                    { from: governor },
                );
            },
            'Fees can\'t be set to less than the minimum fee.',
        );

        itShouldThrow(
            'base fees cannot be greater than 1',
            async () => {
                await mixr.setBaseFee(
                    new BigNumber(await fixidityLibMock.newFixed(1)).plus(1).toString(10),
                    DEPOSIT,
                    { from: governor },
                );
            },
            'Fees can\'t be set to more than 1.',
        );

        it('base fees can be set.', async () => {
            const depositFee = new BigNumber(await fixidityLibMock.newFixed(1)).minus(1).toString(10);
            await mixr.setBaseFee(
                depositFee,
                DEPOSIT,
                { from: governor },
            );
            const result = new BigNumber(await mixr.getDepositFee());
            result.should.be.bignumber.equal(depositFee);
        });
    });

    // These tests rely on another test to have changed the fixtures (ERC20 approval).
    // If the tests order is changed, or if these tests are ran in isolation they will fail.
    describe('proportion management', async () => {
        beforeEach(async () => {
            sampleERC20Decimals = 18;
            sampleERC20DecimalsOther = 18;
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

            await mixr.registerDetailedToken(sampleDetailedERC20.address, {
                from: governor,
            });
            await mixr.registerDetailedToken(sampleDetailedERC20Other.address, {
                from: governor,
            });
        });

        itShouldThrow('stops setting proportions with mismatched token and proportion arrays.', async () => {
            const tokensArray = [sampleDetailedERC20.address];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 2)).toString(10),
                new BigNumber(await fixidityLibMock.newFixedFraction(1, 4)).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        }, 'The number of target proportions supplied doesn\'t match the number of token addresses supplied.');

        itShouldThrow(
            'stops setting proportions for only a subset of registered tokens.',
            async () => {
                const tokensArray = [sampleDetailedERC20.address];
                const proportionArray = [
                    new BigNumber(await fixidityLibMock.newFixed(1)).toString(10),
                ];
                await mixr.setTokensTargetProportion(
                    tokensArray,
                    proportionArray,
                    {
                        from: governor,
                    },
                );
            },
            'Proportions must be given for all registered tokens.',
        );

        itShouldThrow(
            'stops setting proportions to non registered tokens',
            async () => {
                const tokensArray = [
                    someERC721.address,
                    sampleDetailedERC20.address,
                ];
                const proportionArray = [
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                ];
                await mixr.setTokensTargetProportion(
                    tokensArray,
                    proportionArray,
                    {
                        from: governor,
                    },
                );
            },
            'Proportions must be given for all registered tokens.',
        );


        itShouldThrow('forbids to set token target proportions that outside the [0,1] range.', async () => {
            const tokensArray = [
                sampleDetailedERC20.address,
                sampleDetailedERC20Other.address,
            ];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixed(1)).multipliedBy(2).toString(10),
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        }, 'Target proportion not in the [0,1] range.');

        itShouldThrow('forbids to send invalid total proportions', async () => {
            const tokensArray = [
                sampleDetailedERC20.address,
                sampleDetailedERC20Other.address,
            ];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(4).toString(10),
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        }, 'The target proportions supplied must add up to 1.');

        itShouldThrow(
            'stops non-governors from setting target proportions.',
            async () => {
                const tokensArray = [
                    sampleDetailedERC20.address,
                    sampleDetailedERC20Other.address,
                ];
                const proportionArray = [
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                    new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                ];
                await mixr.setTokensTargetProportion(
                    tokensArray,
                    proportionArray,
                    {
                        from: user,
                    },
                );
            },
            'Message sender isn\'t part of the governance whitelist.',
        );

        it('allows a governor to set target proportions', async () => {
            const tokensArray = [
                sampleDetailedERC20.address,
                sampleDetailedERC20Other.address,
            ];
            const proportionArray = [
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
                new BigNumber(await fixidityLibMock.newFixed(1)).dividedBy(2).toString(10),
            ];
            await mixr.setTokensTargetProportion(
                tokensArray,
                proportionArray,
                {
                    from: governor,
                },
            );
        });
    });
});
