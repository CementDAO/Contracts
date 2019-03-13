pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./fixidity/FixidityLib.sol";
import "./MIXRData.sol";
import "./Fees.sol";
import "./Whitelist.sol";
import "./UtilsLib.sol";


/**
 * @title MIXRGovernance.
 * @author Bernardo Vieira.
 * @notice Implements governance functions for a MIXR token.
 */
contract MIXRGovernance is MIXRData, Ownable {

    address internal whitelist;
    /**
     * @notice Constructor with the details of the ERC20.
     */
    constructor(address _whitelist) public {
        whitelist = _whitelist;
    }

    /**
     * @notice Modifier that enforces that the transaction sender is
     * whitelisted to perform governance.
     */
    modifier onlyGovernor() {
        require(
            Whitelist(whitelist).isGovernor(msg.sender),
            "Message sender isn't part of the governance whitelist."
        );
        _;
    }

    /**
     * @notice Set the address of the BILD contract, which will hold the 
     * transaction fees prior to distribution to stakeholders.
     */
    function setBILDContract(address _bild)
        public
        onlyOwner
    {
        require(_bild != NULL_ADDRESS, "Invalid address!");
        /**
         * TODO: we should also verify that it a BILD contract address.
         * Maybe we also want multiple verification.
         */
        BILDContract = _bild;
    }

    /**
     * @notice This function adds an ERC20Detailed token to the registered tokens list.
     */
    function registerDetailedToken(address _token)
        public
        onlyGovernor()
        isCompliantToken(_token)
    {
        registerStandardToken(
            _token,
            // TODO: let's fix!
            "not", // ERC20Detailed(_token).name(),
            ERC20Detailed(_token).decimals()
        );
    }

    /**
     * @notice This function adds an ERC20 token to the registered tokens list.
     */
    function registerStandardToken(address _token, bytes32 _name, uint8 _decimals)
        public
        onlyGovernor()
        isCompliantToken(_token)
    {
        TokenData memory token = tokens[_token];
        require(token.registered == false, "Token is already registered!");
        token.registered = true;
        token.decimals = _decimals;
        token.name = _name;
        tokens[_token] = token;
        tokensList.push(_token);
    }

    /**
     * @notice Set the base fee for deposit, redemption and transfer transactions.
     * @param _token Address for the token that we are setting the fees for.
     * @param _fee Amount to set in fixed point units (FixidityLib.digits()).
     * @param _transactionType One of REDEMPTION(), DEPOSIT() or TRANSFER().
     * @dev
     * Test setTransactionFee(minimumFee) works and token.transactionFee returns minimumFee
     * Test setTransactionFee(minimumFee-1) throws
     */
    function setTransactionFee(address _token, int256 _fee, int8 _transactionType)
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
        require(
            _tokens.length == _proportions.length, 
            "The number of target proportions supplied doesn't match the number of token addresses supplied."
        );

        // Check proportions supplied for all registered tokens.
        uint256 totalTokens;
        address[] memory registeredTokens;
        (registeredTokens, totalTokens) = getRegisteredTokens();
        
        for (uint256 x = 0; x < registeredTokens.length; x += 1) {
            bool found = false;
            for (uint256 y = 0; y < _tokens.length; y += 1) {
                if (registeredTokens[x] == _tokens[y]) {
                    found = true; 
                    break;
                }
            }
            require(
                found == true,
                "Proportions must be given for all registered tokens."
            );
        }

        // Check proportions supplied are valid.
        int256 totalProportions = 0;
        for (uint256 x = 0; x < _proportions.length; x += 1) {
            require(
                _proportions[x] >= 0 && _proportions[x] <= FixidityLib.fixed1(),
                "Target proportion not in the [0,1] range."
            );
            totalProportions = totalProportions + _proportions[x];
        }
        require (
            totalProportions == FixidityLib.fixed1(),
            "The target proportions supplied must add up to 1."
        );

        // Apply changes.
        for (uint256 x = 0; x < _proportions.length; x += 1) {
            TokenData memory token = tokens[_tokens[x]];
            token.targetProportion = _proportions[x];
            tokens[_tokens[x]] = token;
        }
    }
}
