pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./fixidity/FixidityLib.sol";
import "./UtilsLib.sol";

/**
 * @title Base MIXR contract. 
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Implements a basket of stablecoins as an ERC20 token, as described
 * in the CementDAO whitepaper.
 */
contract Base {
    using SafeMath for uint256;

    /**
     * @notice Scaling factor for the calculation of fees, expressed in fixed 
     * point units.
     * @dev Test scalingFactor = FixidityLib.fixed1()/2
     */
    int256 constant public scalingFactor = 500000000000000000000000000000000000;

    /**
     * @notice Minimum that can be returned when calculating a fee, expressed in
     * MIX wei.
     */
    uint256 constant public minimumFee = 1000000000000000000;

    /**
     * @notice (C1) Whitelist of addresses that can do governance.
     */
    mapping(address => bool) internal governors;

    /**
     * @notice Additional token data which is required for MIXR transactions.
     */
    struct TokenData {
        /**
         * @notice Whether a stablecoin has been approved for transactions with
         * the basket.
         */
        bool approved;
        /**
         * @notice The proportion of this token that we want in the basket. 
         * It uses fixed point units in a 0 to FixidityLib.fixed1() range. 
         * If it is set to 0 no deposits are accepted for it.
         */
        int256 targetProportion;
        /**
         * @notice The base deposit fees in MIX wei for this token.
         */
        uint256 depositFee;
        /**
         * @notice The base redemption fees in MIX wei for this token.
         */
        uint256 redemptionFee;
        /**
         * @notice The base transfer fees in MIX wei for this token.
         */
        uint256 transferFee;
    }

    /**
     * @notice Mapping of tokens either candidates for or in the basket.
     */
    mapping(address => TokenData) internal tokens;
    /**
     * @dev Since it's not possible to iterate over a mapping, it's necessary
     * to have an array to iterate over it and verify all the entries.
     */
    address[] internal tokensList;

    /**
     * @notice (C13) As a Stablecoin Holder, I would like to be able to pay any
     * fees with any of the stablecoins on the basket list
     */
    // mapping(address => address) internal payFeesWith;
    
    /**
     * @notice Holding account for fees, before they are distributed to stakeholders.
     */
    address internal stakeholderAccount;

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
            size > 0, "The specified address doesn't look like a deployed contract."
        );

        require(
            IERC20(_token).balanceOf(_token) >= 0 &&
            IERC20(_token).totalSupply() >= 0,
            "The provided address doesn't look like a valid ERC20 implementation."
        );
        _;
    }

    /**
     * @notice Modifier to ensure a token is known to the basket.
     * @param _token The token ERC20 contract address that we are validating.
     */
    modifier isApprovedToken(address _token) {
        TokenData memory token = tokens[_token];
        require(
            token.approved == true,
            "The given token hasn't been introduced to the basket."
        );
        _;
    }

    /**
     * @notice Modifier to ensure a token is accepted for transactions.
     * @param _token The token ERC20 contract address that we are validating.
     * @dev In order to make the code easier to read this method is only a 
     * group of requires
     */
    modifier isInBasketToken(address _token) {
        TokenData memory token = tokens[_token];
        require(
            token.approved == true,
            "The given token isn't listed as accepted."
        );
        require(
            token.targetProportion > 0,
            "The given token can't be accepted, the target proportion is 0."
        );
        require(
            token.depositFee >= minimumFee,
            "The given token can't accepted, the base deposit fee is too low."
        );
        require(
            token.redemptionFee >= minimumFee,
            "The given token can't accepted, the base redemption fee is too low."
        );
        _;
    }

    /**
     * @notice Returns the scaling factor for MIXR, in fixed point units.
     */
    function getScalingFactor() 
    public
    pure
    returns(int256)
    {
        return scalingFactor;
    }

    /**
     * @notice Returns minimum fee that will be charged for transactions, in MIX wei.
     */
    function getMinimumFee() 
    public
    pure
    returns(uint256)
    {
        return minimumFee;
    }

    /**
     * @notice Returns the target proportion of a token, in fixed point units.
     * @param _token The token ERC20 contract address that we are retrieving a
     * target proportion for. The token needs to have been approved for
     * management within the CementDAO set of contracts, but doesn't need to be
     * in the basket.
     */
    function getTargetProportion(address _token) 
    public
    view
    isApprovedToken(_token)
    returns(int256)
    {
        TokenData memory token = tokens[_token];
        return token.targetProportion;
    }

    /**
     * @notice Returns the base deposit fee for a token, in MIX wei.
     * @param _token The token ERC20 contract address that we are retrieving 
     * the base deposit fee for. The token needs to have been approved for
     * management within the CementDAO set of contracts, but doesn't need to be
     * in the basket.
     */
    function getDepositFee(address _token) 
    public
    view
    isApprovedToken(_token)
    returns(uint256)
    {
        TokenData memory token = tokens[_token];
        return token.depositFee;
    }

    /**
     * @notice Returns the base redemption fee for a token, in MIX wei.
     * @param _token The token ERC20 contract address that we are retrieving 
     * the base redemption fee for. The token needs to have been approved for
     * management within the CementDAO set of contracts, but doesn't need to be
     * in the basket.
     */
    function getRedemptionFee(address _token) 
    public
    view
    isApprovedToken(_token)
    returns(uint256)
    {
        TokenData memory token = tokens[_token];
        return token.redemptionFee;
    }

    /**
     * @notice Returns the base transfer fee for a token, in MIX wei.
     * @param _token The token ERC20 contract address that we are retrieving 
     * the base transfer fee for. The token needs to have been approved for
     * management within the CementDAO set of contracts, but doesn't need to be
     * in the basket.
     */
    function getTransferFee(address _token) 
    public
    view
    isApprovedToken(_token)
    returns(uint256)
    {
        TokenData memory token = tokens[_token];
        return token.transferFee;
    }

    /**
     * @notice Returns an address array of approved tokens, and its size
     */
    function getApprovedTokens() 
        public 
        view 
        returns(address[] memory, uint256) 
    {
        uint256 totalAddresses = tokensList.length;
        uint256 activeIndex = 0;
        address[] memory activeAddresses = new address[](totalAddresses);
        for (uint256 totalIndex = 0; totalIndex < totalAddresses; totalIndex += 1) {
            TokenData memory token = tokens[tokensList[totalIndex]];
            if (token.approved) {
                activeAddresses[activeIndex] = tokensList[totalIndex];
                activeIndex += 1; // Unlikely to overflow
            }
        }
        return (activeAddresses, activeIndex);
    }
}
