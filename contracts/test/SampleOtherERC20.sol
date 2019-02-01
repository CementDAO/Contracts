pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/**
 * @dev The SampleERC20 contract isn't part of the business logic
 * for CementDAO. It is a fixture that is only used during tests.
 */
contract SampleOtherERC20 is ERC20 {
    string public constant name = "SampleOtherERC20";
    string public constant symbol = "NEO";
    uint8 public constant decimals = 18;

    uint256 public constant INITIAL_SUPPLY = 525 * (10 ** uint256(decimals));

    /**
    * @dev Constructor that gives _owner all of existing tokens.
    */
    constructor(address _owner) public {
        _mint(_owner, INITIAL_SUPPLY);
        //approve(_owner, INITIAL_SUPPLY);
    }

}
