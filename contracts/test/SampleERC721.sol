pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";


/**
 * @dev The SampleERC721 contract isn't part of the business logic
 * for CementDAO. It is a fixture that is only used during tests.
 */
contract SampleERC721 is ERC721 {
    constructor() public ERC721() {}
}
