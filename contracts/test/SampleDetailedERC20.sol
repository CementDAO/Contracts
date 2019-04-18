pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";


/**
 * @dev The SampleDetailedERC20 contract isn't part of the business logic
 * for CementDAO. It is a fixture that is only used during tests.
 */
contract SampleDetailedERC20 is Initializable, ERC20, ERC20Detailed {

    /**
    * @dev Constructor that gives _owner all of existing tokens.
    * @param _owner the user receiving tokens
    * @param supply the amount of tokens in wei
    * @param decimals the ERC20 decimals
    * @param name token name
    * @param symbol token symbol
    */
    function initialize(
        address _owner,
        uint256 supply,
        uint8 decimals,
        string memory name,
        string memory symbol
    )
        public
        initializer
    {
        ERC20Detailed.initialize(name, symbol, decimals);
        _mint(_owner, supply);
    }

}