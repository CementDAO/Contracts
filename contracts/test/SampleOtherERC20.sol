pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


/**
 * @dev The SampleERC20 contract isn't part of the business logic
 * for CementDAO. It is a fixture that is only used during tests.
 */
contract SampleOtherERC20 is ERC20, ERC20Detailed {

    /**
    * @dev Constructor that gives _owner all of existing tokens.
    * @param _owner the user receiving tokens
    * @param supply the amount of tokens in wei
    * @param decimals the ERC20 decimals
    */
    constructor(address _owner, uint256 supply, uint8 decimals)
        public
        ERC20Detailed("SampleOtherERC20", "TIR", decimals)
    {
        _mint(_owner, supply);
    }

}
