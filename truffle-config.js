const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');

const infuraKey = 'b03c2cbd8095451fa05f44753e08d452';
const mnemonic = fs.readFileSync('.secret').toString().trim();

module.exports = {
    networks: {
        development: {
            host: '127.0.0.1',
            port: 8545,
            network_id: '*',
        },
        ropsten: {
            provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/${infuraKey}`),
            network_id: 3,
            gas: 5500000,
            confirmations: 2,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
    },

    mocha: {
        // see more here: https://www.npmjs.com/package/eth-gas-reporter
        // reporter: 'eth-gas-reporter',
    },

    solc: {
        optimizer: {
            enabled: true,
            runs: 200,
        },
    },

    compilers: {
        solc: {
            version: '0.5.2',
            settings: {
                optimizer: {
                    enabled: false,
                    runs: 200,
                },
            },
        },
    },
};
