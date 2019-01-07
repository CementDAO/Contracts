pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract NEOToken is ERC20 {

    string public constant name = "NEOToken";
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