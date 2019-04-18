pragma solidity ^0.5.7;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @dev The SampleERC20 contract isn't part of the business logic
 * for CementDAO. It is a fixture that is only used during tests.
 */
contract SamplePlainERC20 is ERC20 {

    /**
    * @dev Constructor that gives _owner all of existing tokens.
    * @param _owner the user receiving tokens
    * @param supply the amount of tokens in wei
    */
    constructor(address _owner, uint256 supply)
        public
    {
        _mint(_owner, supply);
    }

}
