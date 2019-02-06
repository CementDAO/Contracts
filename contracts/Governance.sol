pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./fixidity/FixidityLib.sol";
import "./Base.sol";
import "./Utils.sol";


/**
 * @title Governance contract.
 */
contract Governance is Base, Ownable {

    /**
     * @dev Modifier that enforces that the transaction sender is
     * whitelisted to perform governance.
     */
    modifier onlyGovernor() {
        require(
            governors[msg.sender] == true,
            "Message sender isn't part of the governance whitelist."
        );
        _;
    }

    /**
     * @dev Add new user to governors
     * @param _userAddress The user address to be added.
     */
    function addGovernor(address _userAddress)
        public
        onlyOwner
    {
        governors[_userAddress] = true;
    }

    /**
     * @dev Allows to query whether or not a given address is a governor.
     * @param _userAddress The address to be checked.
     * @return true if the provided user is a governor, false otherwise.
     */
    function isGovernor(address _userAddress)
        public
        view
        returns (bool)
    {
        return governors[_userAddress];
    }

    /**
     * @dev Remove user from governors
     * @param _userAddress the user address to remove
     */
    function removeGovernor(address _userAddress)
        public
        onlyOwner
    {
        delete governors[_userAddress];
    }

    /**
     * @dev (C3) This function adds an ERC20 token to the approved tokens list.
     */
    function approveToken(address _token)
        public
        onlyGovernor()
        isCompliantToken(_token)
    {
        TokenData memory token = tokens[_token];
        require(token.approved == false, "Token is already approved!");
        token.approved = true;
        tokens[_token] = token;
        tokensList.push(_token);
    }

    /**
     * @dev (C4) This function sets a proportion for a token in the basket,
     * allowing this smart contract to receive them. This proportions are
     * stored as fixidity units.
     * Test setTokenTargetProportions() throws if the proportions passed on the parameter don’t add up to FixidityLib.fixed_1()
     * Test setTokenTargetProportions() throws if the proportions passed on the parameter don’t exactly match the approved tokens.
     * Test setTokenTargetProportions() throws if any of the proportions passed on the parameter is below 0
     * Test setTokenTargetProportions([FixidityLib.fixed_1()]) works for one approved token.
     * Test setTokenTargetProportions([FixidityLib.fixed_1()/2,FixidityLib.fixed_1()/2]) works for two approved tokens.
     * Test setTokenTargetProportions([FixidityLib.fixed_1(),0]) works for two approved tokens.
     */
    function setTokensTargetProportion(address[] memory _tokens, int256[] memory _proportions)
        public
        onlyGovernor()
    {
        uint256 nTokens = _tokens.length;
        uint256 nProportions = _proportions.length;
        require(nTokens == nProportions, "Invalid number of elements!");
        /* require(
            Utils.arraySum(_proportions) == FixidityLib.fixed_1(),
            "Invalid total of proportions."
        ); */
        for(uint256 x = 0; x < nTokens; x += 1) {
            TokenData memory token = tokens[_tokens[x]];
            /* require(
                _proportions[x] > 0,
                "Invalid proportion."
            ); */
            require(
                token.approved == true,
                "The given token isn't listed as accepted."
            );
            token.targetProportion = _proportions[x];
            tokens[_tokens[x]] = token;
        }
    }
}
