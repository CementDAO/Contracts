pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";


contract KittyToken is ERC721 {
    constructor()
        public
        ERC721()
    {
    }
}