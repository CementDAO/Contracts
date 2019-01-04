pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./SetLib.sol";


/** @title MIXR contract. */
contract MIXR is ERC20, Ownable {
    /**
     * @dev MIXR is an ERC20 token which is created as a basket of tokens.
     * This means that in addition to the usual ERC20 features the MIXR token
     * can react to transfers of tokens other than itself
     */

    /** @dev (C1) Whitelist of addresses that can do governance. */
    SetLib.Data private whitelist;

    /**
     * @dev (C2, C3) This is list of stablecoins that can be stored in the basket,
     * only if their proportion is set to > 0.
     */
    SetLib.Data private basket; 

    /**
     * @dev (C4) The proportion of each token we want in the basket,
     * this is just an integer for each token, and then the proportion
     * for token i is calculated as proportions[i]/sum(proportions)
     */
    mapping(address => uint256) proportions; 

    /**
     * @dev As an ERC20 it might the name.
     */
    string public constant name = "MIXR";
    string public constant symbol = "MIXR";
    uint8 public constant decimals = 18;

    /**
     * @dev (C1) Whitelist of addresses that can do governance.
     * Modifier to allow governance only to whitelisted addresses
     */
    modifier onlyWhitelist() {
        require(SetLib.contains(whitelist, msg.sender), "User not allowed!");
        _;
    }

    /**
     * @dev In order to make the code easier to read
     * this method is only a group of requires
     */
    modifier isValidToken(address _token) {
        require(
            SetLib.contains(basket, _token),
            "Deposit failed, token needs to be added to basket by a Rating Agent first.");
        require(
            proportions[_token] > 0,
            "Token not approved! Please configure the basket proportions to allow it.");
        _;
    }

    /**
     * @dev Add new user to whitelist
     * @param _userAddress the user address to add
     */
    function addToWhiteList(address _userAddress)
        public
        onlyOwner
    {
        SetLib.insert(whitelist, _userAddress);
    }

    /**
     * @dev Remove user from whitelist
     * @param _userAddress the user address to remove
     */
    function removeFromWhiteList(address _userAddress)
        public
        onlyOwner
    {
        SetLib.remove(whitelist, _userAddress);
    }

    /**
     * @dev (C11) This function allows to deposit to the MIXR basket an
     * ERC20 token in the list, and returns a MIXR token in exchange.
     */
    function depositToken(address _token, uint256 amount)
        public
        isValidToken(_token)
    {
        _mint(address(this), amount);
        IERC20(address(this)).approve(address(this), amount);
        IERC20(_token).transferFrom(
            msg.sender, address(this), amount); // Receive the token that was sent
        IERC20(address(this)).transferFrom(
            address(this), msg.sender, amount); // Send an equal number of MIXR tokens back
    }

    /**
     * @dev (C12) This function allows to deposit to the MIXR basket
     * an amount ERC20 token in the list, and returns a MIXR token in exchange.
     */
    /* Alberto: I would suggest that if the redeemer wants to receive
     * several different tokens that is managed from the frontend as
     * several consecutive but separate transactions
     */
    function redeemToken(address _token, uint256 amount)
        public
        isValidToken(_token)
    {
        IERC20(_token).approve(address(this), amount);
        IERC20(address(this)).transferFrom(
            msg.sender, address(this), amount); // Receive the MIXR token that was sent
        IERC20(_token).transferFrom(
            address(this), msg.sender, amount); // Send an equal number of selected tokens back
        _burn(address(this), amount);
    }

    /** @dev (C3) This function adds an ERC20 token to the approved tokens list */
    function addToApprovedTokens(address _token)
        public
        onlyWhitelist
    {
        SetLib.insert(basket, _token);
    }

    /**
     * @dev (C4) This function sets a proportion for a token in the basket,
     * allowing this smart contract to receive them
     */
    function addToBasketTokens(address _token, uint256 proportion)
        public
        onlyWhitelist
    {
        require(SetLib.contains(basket, _token), "Token not in basket!");
        proportions[_token] = proportion;
    }

}