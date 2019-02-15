const FixidityLib = artifacts.require('./fixidity/FixidityLib.sol');
const LogarithmLib = artifacts.require('./fixidity/LogarithmLib.sol');
const UtilsLib = artifacts.require('./UtilsLib.sol');
const FixidityLibMock = artifacts.require('./mocks/FixidityLibMock.sol');
const LogarithmLibMock = artifacts.require('./mocks/LogarithmLibMock.sol');
const UtilsLibMock = artifacts.require('./mocks/UtilsLibMock.sol');

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
    // deploy UtilsLib lib
    deployer.deploy(UtilsLib);
    deployer.link(UtilsLib, UtilsLibMock);
    deployer.deploy(UtilsLibMock);
};
