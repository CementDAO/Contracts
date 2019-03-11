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
        whitelist = await Whitelist.deployed();
        bild = await BILD.deployed();
    });

    describe('constructor', () => {
        beforeEach(async () => {
            whitelist = await Whitelist.new();
            bild = await BILD.new(distributor, whitelist.address);
        });
        it('distributor gets all BILD tokens', async () => {
            const distributorBalance = new BigNumber(
                await bild.balanceOf(distributor),
            );
            const bildSupply = new BigNumber(
                await bild.totalSupply(),
            );
            distributorBalance.should.be.bignumber.equal(bildSupply);
        });
    });
});
