# CementDAO
This repository implements the functionality from the CementDAO white paper.

## Introduction
The CementDAO whitepaper describes an ERC20 token called MIX which has the functionality of a basket of currencies  called MIXR. In more specific terms MIX is a stablecoin backed by the stablecoins deposited in the MIXR. The governance of the MIXR is delegated to an Autonomous Distributed Organisation that decides on aspects such as which currencies are allowed in the basket and all the financial-technical parameters.

## MIXR - A Basket of Stablecoins
Base.sol implements the logic for an ERC20 token that itself owns other ERC20 tokens.

MIXR.sol implements the logic for the stablecoin-backed ERC20 functionality of MIX. The two functions implemented for deposits and redemptions encapsulate the logic that one MIX token always equals exactly one unit of any ERC20 token in the basket, effectively anchoring MIX as a stablecoin itself. As part of any deposit or redemption operations a fee is calculated and diverted to a stakeholder account.

Fees.sol implements the formulas for calculating transaction fees as detailed in the CementDAO white paper.

## MIXRGovernance - Distributed Autonomous Organization

## Utilities
