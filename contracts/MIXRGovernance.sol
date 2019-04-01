pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "fixidity/contracts/FixidityLib.sol";
import "./MIXRData.sol";
import "./Fees.sol";
import "./Whitelist.sol";
import "./UtilsLib.sol";


/**
 * @title MIXRGovernance.
 * @author Bernardo Vieira.
 * @notice Implements governance functions for a MIXR token.
 */
contract MIXRGovernance is Initializable, MIXRData, Ownable {

    address internal whitelist;
    /**
     * @notice Constructor with the details of the ERC20.
     */
    function initialize(address _owner, address _whitelist)
        public
        initializer
    {
        Ownable.initialize(_owner);
        whitelist = _whitelist;
    }

    /**
     * @notice Modifier that enforces that the transaction sender is
     * whitelisted to perform governance.
     */
    modifier onlyGovernor() {
        require(
            Whitelist(whitelist).isGovernor(msg.sender),
            "Not allowed."
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
            ERC20Detailed(_token).name(),
            ERC20Detailed(_token).symbol(),
            ERC20Detailed(_token).decimals()
        );
    }

    /**
     * @notice This function adds an ERC20 token to the registered tokens list.
     */
    function registerStandardToken(address _token, string memory _name, string memory _symbol, uint8 _decimals)
        public
        onlyGovernor()
        isCompliantToken(_token)
    {
        TokenData memory token = tokens[_token];
        require(token.registered == false, "Token already registered.");
        token.registered = true;
        token.decimals = _decimals;
        token.name = _name;
        token.symbol = _symbol;
        tokens[_token] = token;
        tokensList.push(_token);
    }

    /**
     * @notice Set the base fee for deposit, redemption and transfer transactions.
     * @param _fee Amount to set in fixed point units (FixidityLib.digits()).
     * @param _transactionType One of REDEMPTION(), DEPOSIT() or TRANSFER().
     */
    function setBaseFee(int256 _fee, int8 _transactionType)
        public
        onlyGovernor()
    {
        require(_fee >= minimumFee, "Below minimum fee.");
        require(_fee <= FixidityLib.fixed1(), "Above 1.");
        if (_transactionType == Fees.DEPOSIT()) baseDepositFee = _fee;
        else if (_transactionType == Fees.TRANSFER()) baseTransferFee = _fee;
        else if (_transactionType == Fees.REDEMPTION()) baseRedemptionFee = _fee;
        else revert("Type not accepted.");
    }

    /**
     * @notice This function sets a proportion for a token in the basket,
     * allowing this smart contract to receive them. This proportions are
     * stored as fixidity units.
     */
    function setTokensTargetProportion(address[] memory _tokens, int256[] memory _proportions)
        public
        onlyGovernor()
    {
        require(
            _tokens.length == _proportions.length, 
            "Invalid sizes."
        );

        // Check proportions supplied for all registered tokens.
        address[] memory registeredTokens = getRegisteredTokens();
        // prevent to set subsets
        require(registeredTokens.length == _tokens.length);

        // Check proportions supplied are valid.
        int256 totalProportions = 0;
        for (uint256 x = 0; x < _proportions.length; x += 1) {
            require(
                _proportions[x] >= 0 && _proportions[x] <= FixidityLib.fixed1(),
                "Invalid proportion."
            );
            bool found = false;
            for (uint256 y = 0; y < registeredTokens.length; y += 1) {
                if (registeredTokens[y] == _tokens[x]) {
                    found = true; 
                    break;
                }
            }
            require(
                found == true,
                "Token not found."
            );
            //
            totalProportions = totalProportions + _proportions[x];
            // Apply changes.
            TokenData memory token = tokens[_tokens[x]];
            token.targetProportion = _proportions[x];
            tokens[_tokens[x]] = token;
        }
        require (
            totalProportions == FixidityLib.fixed1(),
            "Invalid total proportion."
        );
    }
}
