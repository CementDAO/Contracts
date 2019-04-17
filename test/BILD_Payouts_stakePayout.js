const BILD = artifacts.require('./BILD.sol');
const Whitelist = artifacts.require('./Whitelist.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    let whitelist;
    const distributor = accounts[1];

    before(async () => {
        bild = await BILD.deployed();
        whitelist = await Whitelist.deployed();
    });

    describe('stakePayout', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);
        });
        it('(7*5)/3 = 4 (rounded)', async () => {
            const totalPayout = 7;
            const agentStakes = 5;
            const holderStakes = 3;
            const payout = new BigNumber(await bild.stakePayout(
                totalPayout,
                agentStakes,
                holderStakes,
            ));
            payout.should.be.bignumber.equal(4);
        });
    });
});
