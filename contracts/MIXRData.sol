pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "fixidity/contracts/FixidityLib.sol";
import "./UtilsLib.sol";
import "./IMIXR.sol";


/**
 * @title Base MIXR contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements a basket of stablecoins as an ERC20 token, as described
 * in the CementDAO whitepaper.
 */
contract MIXRData is IMIXR {
    using SafeMath for uint256;

    /**
     * @notice An initializated address.
     */
    // solium-disable-next-line mixedcase
    address public NULL_ADDRESS = address(0);

    /**
     * @notice Scaling factor for the calculation of fees, expressed in fixed 
     * point units.
     * @dev Test scalingFactor = FixidityLib.fixed1()/2
     */
    int256 constant public scalingFactor = 500000000000000000000000;

    /**
     * @notice Minimum that can be returned when calculating a percentage fee,
     * expressed in in fixed point units (FixidityLib.digits()).
     */
    int256 constant public minimumFee = 1000000000000000000;
        
    /**
     * @notice The base deposit percentage fees in fixed point units (FixidityLib.digits()).
     */
    int256 public baseDepositFee;
    /**
     * @notice The base redemption percentage fees in fixed point units (FixidityLib.digits()).
     */
    int256 public baseRedemptionFee;
    /**
     * @notice The base transfer percentage fees in fixed point units (FixidityLib.digits()).
     */
    int256 public baseTransferFee;

    /**
     * @notice Additional token data which is required for MIXR transactions.
     */
    struct TokenData {
        /**
         * @notice Whether a stablecoin has been registered for the DAO.
         */
        bool registered;
        /**
         * @notice The number of decimals that this token can be broken into.
         */
        uint8 decimals;
        /**
         * @notice The proportion of this token that we want in the basket. 
         * It uses fixed point units in a 0 to FixidityLib.fixed1() range. 
         * If it is set to 0 no deposits are accepted for it.
         * @dev We don't use decimals() from ERC20Detailed for tokens in the
         * basket because tokens we might want in the basket might not
         * implement it.
         */
        int256 targetProportion;
        /**
         * @notice The token name.
         */
        string name;
        string symbol;
    }

    /**
     * @notice Mapping of tokens either candidates for or in the basket.
     */
    mapping(address => TokenData) public tokens;
    /**
     * @dev Since it's not possible to iterate over a mapping, it's necessary
     * to have an array to iterate over it and verify all the entries.
     */
    address[] public tokensList;

    /**
     * @notice (C13) As a Stablecoin Holder, I would like to be able to pay any
     * fees with any of the stablecoins on the basket list
     */
    // mapping(address => address) internal payFeesWith;
    
    /**
     * @notice BILD Contract address, which will receive the fees before they are distributed to stakeholders.
     */
    // solium-disable-next-line mixedcase
    address public BILDContract;

    /**
     * @dev This is one of the possible solutions allowing to check
     * if an address is an implementation of an interface.
     * See https://stackoverflow.com/questions/45364197
     */
    modifier isCompliantToken(address _token) {
        uint size;
        // See https://stackoverflow.com/a/40939341 to understand the following test.
        // Make sure to never use this test alone, as it can yeld fake positives when
        // inverted. It *must* be used in conjunction of other tests, eg methods existence.
        // solium-disable-next-line security/no-inline-assembly
        assembly { size := extcodesize(_token) }
        require(
            size > 0, "Address is not a contract."
        );

        require(
            IERC20(_token).balanceOf(_token) >= 0 &&
            IERC20(_token).totalSupply() >= 0,
            "Address is not an ERC20."
        );
        _;
    }

    /**
     * @notice Modifier to ensure a token is known to the DAO.
     * @param _token The token ERC20 contract address that we are validating.
     */
    modifier isRegistered(address _token) 
    {
        TokenData memory token = tokens[_token];
        require(
            token.registered == true,
            "Token is not registered."
        );
        _;
    }

    /**
     * @notice Modifier to ensure a token is accepted for deposits.
     * @param _token The token ERC20 contract address that we are validating.
     * @dev In order to make the code easier to read this method is only a 
     * group of requires
     */
    modifier acceptedForDeposits(address _token) 
    {
        TokenData memory token = tokens[_token];
        require(
            token.registered == true,
            "Token is not registered."
        );
        require(
            token.targetProportion > 0,
            "Target proportion is 0."
        );
        _;
    }

    /**
     * @notice Modifier to ensure a token is accepted for redemptions.
     * @param _token The token ERC20 contract address that we are validating.
     * @dev In order to make the code easier to read this method is only a 
     * group of requires
     */
    modifier acceptedForRedemptions(address _token) 
    {
        TokenData memory token = tokens[_token];
        require(
            token.registered == true,
            "Token is not registered."
        );
        require(
            IERC20(_token).balanceOf(address(this)) > 0,
            "No given tokens."
        );
        _;
    }

    /**
     * @notice Returns the decimals of a token.
     * @param _token The token ERC20 contract address that we are retrieving a
     * target proportion for. The token needs to have been registered in 
     * CementDAO.
     * @dev The MIX token inheriting from MIXRData implements ERC20Detailed and you
     * can retrieve its decimals as mixr.decimals().
     */
    function getDecimals(address _token) 
    public
    view
    isRegistered(_token)
    returns(uint8)
    {
        return tokens[_token].decimals;
    }

    /**
     * @notice Returns the name of a token.
     * @param _token The token ERC20 contract address that we are retrieving 
     * the name. The token needs to have been registered in CementDAO.
     * @dev The MIX token inheriting from MIXRData implements ERC20Detailed and you
     * can retrieve its name as mixr.name().
     */
    function getName(address _token) 
    public
    view
    isRegistered(_token)
    returns(string memory)
    {
        return tokens[_token].name;
    }

    /**
     * @notice Returns the name of a token.
     * @param _token The token ERC20 contract address that we are retrieving 
     * the name. The token needs to have been registered in CementDAO.
     * @dev The MIX token inheriting from MIXRData implements ERC20Detailed and you
     * can retrieve its name as mixr.name().
     */
    function getSymbol(address _token) 
    public
    view
    isRegistered(_token)
    returns(string memory)
    {
        return tokens[_token].symbol;
    }

    /**
     * @notice Returns the target proportion of a token, in fixed point units.
     * @param _token The token ERC20 contract address that we are retrieving a
     * target proportion for. The token needs to have been registered in 
     * CementDAO.
     */
    function getTargetProportion(address _token) 
    public
    view
    isRegistered(_token)
    returns(int256)
    {
        return tokens[_token].targetProportion;
    }

    /**
     * Generic method to get available tokens under some condition
     */
    function getTokensIf(uint8 _conditionN)
        public 
        view 
        returns(address[] memory) 
    {
        uint256 totalAddresses = tokensList.length;
        uint256 activeIndex = 0;
        address[] memory activeAddresses = new address[](totalAddresses);
        for (uint256 totalIndex = 0; totalIndex < totalAddresses; totalIndex += 1) {
            TokenData memory token = tokens[tokensList[totalIndex]];
            if (
                (_conditionN == 1 && token.registered) ||
                (_conditionN == 2 && token.registered && token.targetProportion > 0) ||
                (_conditionN == 3 && token.registered && IERC20(tokensList[totalIndex]).balanceOf(address(this)) > 0)
            ) {
                activeAddresses[activeIndex] = tokensList[totalIndex];
                activeIndex += 1; // Unlikely to overflow
            }
        }
        // Do we need to return activeIndex? Can't the caller use activeAddresses.length?
        return activeAddresses;
    }

    /**
     * @notice Returns an address array of registered tokens, and its size
     */
    function getRegisteredTokens() 
        public 
        view 
        returns(address[] memory) 
    {
        return getTokensIf(1);
    }

    /**
     * @notice Returns an address array of tokens that are accepted for deposits, and their size
     */
    function getTokensAcceptedForDeposits()
        public
        view
        returns(address[] memory)
    {
        return getTokensIf(2);
    }

    /**
     * @notice Returns an address array of tokens that are accepted for redemptions, and their size
     */
    function getTokensAcceptedForRedemptions()
        public
        view
        returns(address[] memory)
    {
        return getTokensIf(3);
    }
}
