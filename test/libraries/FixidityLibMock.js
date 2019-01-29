const FixidityLibMock = artifacts.require('./FixidityLibMock.sol');

const BigNumber = require('bignumber.js');

contract('FixidityLibMock', () => {
    let fixidityLibMock;

    before(async () => {
        fixidityLibMock = await FixidityLibMock.deployed();
    });

    it('newFromInt256', async () => {
        const balance = await fixidityLibMock.newFromInt256(1);
        console.log(balance);
    });

});
