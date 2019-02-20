pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./fixidity/FixidityLib.sol";
import "./Base.sol";
import "./Fees.sol";
import "./UtilsLib.sol";


/**
 * @title Governance.
 * @author Bernardo Vieira.
 * @notice Implements governance functions for a MIXR token as described in the
 * CementDAO whitepaper.
 */
contract Governance is Base, Ownable {

    /**
     * @notice Modifier that enforces that the transaction sender is
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
     * @notice Add new user to governors
     * @param _userAddress The user address to be added.
     */
    function addGovernor(address _userAddress)
        public
        onlyOwner
    {
        governors[_userAddress] = true;
    }

    /**
     * @notice Allows to query whether or not a given address is a governor.
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
     * @notice Remove user from governors
     * @param _userAddress the user address to remove
     */
    function removeGovernor(address _userAddress)
        public
        onlyOwner
    {
        delete governors[_userAddress];
    }

    /**
     * @notice This function adds an ERC20 token to the registered tokens list.
     */
    function registerToken(address _token, uint8 _decimals)
        public
        onlyGovernor()
        isCompliantToken(_token)
    {
        TokenData memory token = tokens[_token];
        require(token.registered == false, "Token is already registered!");
        token.registered = true;
        token.decimals = _decimals;
        tokens[_token] = token;
        tokensList.push(_token);
    }

    /**
     * @notice This function adds an ERC20Detailed token to the registered tokens list.
     */
    function registerToken(address _token)
        public
        onlyGovernor()
        isCompliantToken(_token)
    {
        registerToken(_token, ERC20Detailed(_token).decimals());
    }

    /**
     * @notice Set which account will hold the transaction fees prior to 
     * distribution to stakeholders.
     */
    function setAccountForFees(address _wallet)
        public
        onlyGovernor()
    {
        require(_wallet != address(0), "Invalid wallet address!");
        /**
         * TODO: we should also verify that it's not a contract address.
         * Maybe we also want multiple verification.
         */
        stakeholderAccount = _wallet;
    }

    /**
     * @notice Set the base fee for deposit, redemption and transfer transactions.
     * @param _token Address for the token that we are setting the fees for.
     * @param _fee Amount to set in MIX wei.
     * @param _transactionType One of REDEMPTION(), DEPOSIT() or TRANSFER().
     * @dev
     * Test setTransactionFee(minimumFee) works and token.transactionFee returns minimumFee
     * Test setTransactionFee(minimumFee-1) throws
     */
    function setTransactionFee(address _token, uint256 _fee, int8 _transactionType)
        public
        onlyGovernor()
    {
        require(_fee >= minimumFee, "Fees can't be set to less than the minimum fee.");
        TokenData memory token = tokens[_token];
        if (_transactionType == Fees.DEPOSIT()) token.depositFee = _fee;
        else if (_transactionType == Fees.TRANSFER()) token.transferFee = _fee;
        else if (_transactionType == Fees.REDEMPTION()) token.redemptionFee = _fee;
        else revert("Transaction type not accepted.");
        
        tokens[_token] = token;
    }

    /**
     * @notice This function sets a proportion for a token in the basket,
     * allowing this smart contract to receive them. This proportions are
     * stored as fixidity units.
     * @dev
     * Test setTokenTargetProportions() throws if the proportions passed on the parameter don’t add up to FixidityLib.fixed1()
     * Test setTokenTargetProportions() throws if the proportions passed on the parameter don’t exactly match the approved tokens.
     * Test setTokenTargetProportions() throws if any of the proportions passed on the parameter is below 0
     * Test setTokenTargetProportions([FixidityLib.fixed1()]) works for one approved token.
     * Test setTokenTargetProportions([FixidityLib.fixed1()/2,FixidityLib.fixed1()/2]) works for two approved tokens.
     * Test setTokenTargetProportions([FixidityLib.fixed1(),0]) works for two approved tokens.
     */
    function setTokensTargetProportion(address[] memory _tokens, int256[] memory _proportions)
        public
        onlyGovernor()
    {
        uint256 nTokens = _tokens.length;
        uint256 nProportions = _proportions.length;
        require(
            nTokens == nProportions, 
            "Target proportions must be set for all registered tokens simultaneously."
        );
        for(uint256 x = 0; x < nTokens; x += 1) {
            TokenData memory token = tokens[_tokens[x]];
            require(
                _proportions[x] >= 0 && _proportions[x] <= FixidityLib.fixed1(),
                "Target proportion not in the [0,1] range."
            );
            require( // This should use the isRegistered modifier somehow.
                token.registered == true,
                "The given token is not registered."
            );
            token.targetProportion = _proportions[x];
            tokens[_tokens[x]] = token;
        }
        require(
            areNewProportionsValid() == true,
            "The target proportions supplied must add up to 1."
        );
    }

    /**
     * @notice Check if the token target proportions are valid by verifying
     * that they add up to fixed1().
     */
    function areNewProportionsValid()
        private
        view
        returns(bool)
    {
        int256 newProportions = 0;
        // This should use getRegisteredTokens()
        uint256 nExistingTokens = tokensList.length;
        for(uint256 x = 0; x < nExistingTokens; x += 1) {
            TokenData memory token = tokens[tokensList[x]];
            if (token.registered == true) {
                newProportions = newProportions + token.targetProportion;
            }
        }
        return (newProportions == FixidityLib.fixed1());
    }
}
