pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./SetLib.sol";


/**
 * @title MIXR contract.
 * @dev MIXR is an ERC20 token which is created as a basket of tokens.
 * This means that in addition to the usual ERC20 features the MIXR token
 * can react to transfers of tokens other than itself
 */
contract MIXR is ERC20, ERC20Detailed, Ownable {
    using SetLib for SetLib.Data;

    /**
     * @dev (C1) Whitelist of addresses that can do governance.
     */
    SetLib.Data private governors;

    /**
     * @dev (C2, C3) This is list of stablecoins that can be stored in the basket,
     * only if their proportion is set to > 0.
     */
    SetLib.Data private basket; 

    /**
     * @dev (C4) The proportion of each token we want in the basket,
     * this is just an integer for each token, and then the proportion
     * for token i is calculated as proportions[i] / sum(proportions)
     */
    mapping(address => uint256) private proportions; 

    /**
     * @dev Constructor with the details of the ERC20.
     */
    constructor()
        public
        ERC20Detailed("MIXR", "MIXR", 18)
    {
        //   
    }

    /**
     * @dev (C1) Whitelist of addresses that can do governance.
     * Modifier to allow governance only to whitelisted addresses
     */
    modifier onlyGovernor() {
        require(governors.contains(msg.sender), "User not allowed!");
        _;
    }

    /**
     * @dev Currently there's not a right way to find out if an address is
     * an ERC20 token. One possible solutions is explained here
     * https://stackoverflow.com/questions/45364197/
     */
    modifier isValidERC20(address _token) {
        require(
            IERC20(_token).balanceOf(_token) >= 0,
            "This is not a valid ERC20 address.");
        require(
            IERC20(_token).totalSupply() >= 0,
            "This is not a valid ERC20 address.");
        _;
    }

    /**
     * @dev In order to make the code easier to read
     * this method is only a group of requires
     */
    modifier isAvailableToken(address _token) {
        require(
            basket.contains(_token),
            "Deposit failed, token needs to be added to basket by a Rating Agent first.");
        require(
            proportions[_token] > 0,
            "Token not approved! Please configure the basket proportions to allow it.");
        _;
    }

    /**
     * @dev According to https://stackoverflow.com/a/40939341 by Manuel Aráoz
     * one of the openzeppelin team by the moment I'm writting, is possible to
     * check if an address is a contract.
     */
    modifier isContract(address _verifyAddress) {
        uint size;
        // solium-disable-next-line security/no-inline-assembly
        assembly { size := extcodesize(_verifyAddress) }
        require(size > 0, "Address is not a contract.");
        _;
    }

    /**
     * @dev Add new user to governors
     * @param _userAddress the user address to add
     */
    function addToWhiteList(address _userAddress)
        public
        onlyOwner
    {
        governors.insert(_userAddress);
    }

    /**
     * @dev Remove user from governors
     * @param _userAddress the user address to remove
     */
    function removeFromWhiteList(address _userAddress)
        public
        onlyOwner
    {
        governors.remove(_userAddress);
    }

    /**
     * @dev (C11) This function allows to deposit to the MIXR basket an
     * ERC20 token in the list, and returns a MIXR token in exchange.
     */
    function depositToken(address _token, uint256 _amount)
        public
        isAvailableToken(_token)
    {
        _mint(address(this), _amount);
        IERC20(address(this)).approve(address(this), _amount);
        IERC20(_token).transferFrom(
            msg.sender, address(this), _amount); // Receive the token that was sent
        IERC20(address(this)).transferFrom(
            address(this), msg.sender, _amount); // Send an equal number of MIXR tokens back
    }

    /**
     * @dev (C12) This function allows to deposit to the MIXR basket
     * an amount ERC20 token in the list, and returns a MIXR token in exchange.
     * 
     * Alberto: I would suggest that if the redeemer wants to receive
     * several different tokens that is managed from the frontend as
     * several consecutive but separate transactions.
     */
    function redeemToken(address _token, uint256 _amount)
        public
        isAvailableToken(_token)
    {
        IERC20(_token).approve(address(this), _amount);
        IERC20(address(this)).transferFrom(
            msg.sender, address(this), _amount); // Receive the MIXR token that was sent
        IERC20(_token).transferFrom(
            address(this), msg.sender, _amount); // Send an equal number of selected tokens back
        _burn(address(this), _amount);
    }

    /** @dev (C3) This function adds an ERC20 token to the approved tokens list */
    function addToApprovedTokens(address _token)
        public
        onlyGovernor
        isContract(_token)
        isValidERC20(_token)
    {
        basket.insert(_token);
    }

    /**
     * @dev (C4) This function sets a proportion for a token in the basket,
     * allowing this smart contract to receive them
     */
    function addToBasketTokens(address _token, uint256 _proportion)
        public
        onlyGovernor
    {
        require(basket.contains(_token), "Token not approved!");
        proportions[_token] = _proportion;
    }

}
