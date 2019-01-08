pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";


contract KittyToken is ERC721Full {
    constructor() public
        ERC721Full("KittyToken", "KTT")
    {
    }
}