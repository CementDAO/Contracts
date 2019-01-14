module.exports = {
  networks: {},
  mocha: {},

  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },

  compilers: {
    solc: {
      version: "0.5.0"
    }
  }
};
