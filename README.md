# Contracts

CementDAO Smart contracts

## Preparation

You must have `npm` and `yarn` on your system. We also recommend using `npx` globally to avoid having to adapt platform-dependent commands. From there, you can:

- Install the dependencies `yarn install`.
- Build the smart contract to ensure they are syntax-error free: `npx truffle build`.

## Usage

This is built using openzeppelin-solidity.

- You can run the whole test suite by running `yarn test`.
- To make sure solidity code is linted properly, issue `yarn lint`.
- To see coverage results, use `yarn coverage`.

## Important notes

The contracts in `/test` folder are not part of this project business' logic and are only used during tests.
