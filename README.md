# Contracts

CementDAO Smart contracts

## Preparation

You must have `npm` and `yarn` on your system. We also recommend using `npx` globally to avoid having to adapt platform-dependent commands. From there, you can:

- Install the dependencies `yarn install`.
- Build the smart contract to ensure they are syntax-error free: `npx truffle build`.

## Usage

This is built using openzeppelin-solidity.

- You can run the whole test suite by running `yarn test`.
- To make sure solidity code is linted properly, issue `yarn lint:solidity`.
- To make sure js code is linted properly, issue `yarn lint:js`.
- To make sure all code is linted properly, issue `yarn lint`.
- To run security checks in solidity code, make sure to have [docker](https://www.docker.com/) and run `yarn security`*
- To see coverage results, use `yarn coverage`.

NOTE: all this command should be run from the project root folder.
* If you get an error like `WARNING: Your kernel does not support swap limit capabilities or the cgroup is not mounted. Memory limited without swap.` don't get [scared](https://stackoverflow.com/a/48690137).

## Important notes

The contracts in `/test` folder are not part of this project business' logic and are only used during tests.
