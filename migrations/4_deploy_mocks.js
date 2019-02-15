const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');
const Utils = artifacts.require('./Utils.sol');
const FixidityLibMock = artifacts.require('./mocks/FixidityLibMock.sol');
const LogarithmLibMock = artifacts.require('./mocks/LogarithmLibMock.sol');
const UtilsMock = artifacts.require('./mocks/UtilsMock.sol');

module.exports = (deployer) => {
    // deploy fixidity lib
    deployer.deploy(FixidityLib);
    deployer.link(FixidityLib, FixidityLibMock);
    deployer.link(FixidityLib, LogarithmLibMock);
    // deploy logarithm lib
    deployer.deploy(LogarithmLib);
    deployer.link(LogarithmLib, LogarithmLibMock);
    // deploy fixidity lib mock
    deployer.deploy(FixidityLibMock);
    deployer.deploy(LogarithmLibMock);
    // deploy utils lib
    deployer.deploy(Utils);
    deployer.link(Utils, UtilsMock);
    deployer.deploy(UtilsMock);
};
