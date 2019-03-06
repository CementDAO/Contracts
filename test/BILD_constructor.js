const BILD = artifacts.require('./BILD.sol');

const BigNumber = require('bignumber.js');
const chai = require('chai');
// use default BigNumber
chai.use(require('chai-bignumber')()).should();

contract('BILD', (accounts) => {
    let bild;
    const distributor = accounts[1];

    before(async () => {
        bild = await BILD.deployed();
    });

    describe('constructor', () => {
        beforeEach(async () => {
            bild = await BILD.new(distributor);
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
