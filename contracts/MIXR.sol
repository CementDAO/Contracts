pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./MIXRGovernance.sol";
import "./Fees.sol";


/**
 * @title MIXR contract.
 * @dev MIXR is an ERC20 token which is created as a basket of tokens.
 * This means that in addition to the usual ERC20 features the MIXR token
 * can react to transfers of tokens other than itself.
 */
contract MIXR is MIXRGovernance, ERC20, ERC20Detailed {

    /**
     * @notice Constructor with the details of the ERC20.
     */
    constructor(address _whitelist)
    public
    ERC20Detailed("MIX", "MIX", 24)
    MIXRGovernance(_whitelist)
    {
        
    }

    /**
     * @notice Returns the total amount of tokens in the basket. Tokens 
     * always use a kind of fixed point representation were a whole token 
     * equals a value of something like 10**18 in the balance, with a uint8
     * decimals member. This function finds the difference in decimals between
     * the fixed point library and the token definition and multiplies or 
     * divides accordingly to be able to aggregate the balances of all the
     * tokens to the same fixed point standard. 
     * @dev 
     * In MIXR it should be identical to IERC20(address(this)).totalSupply()
     * Make token x to have 18 decimals and y 20 decimals
     * Make sure the MIX basket is constructed with 24 decimals
     * Test basketBalance() = 0 before introducing any tokens.
     * Test basketBalance() = (10**24) after introducing 1 token of x type
     * Test basketBalance() = 2*(10**24) after introducing 1 token of x type
     * Test basketBalance() = 3*(10**24) after introducing 1 token of y type
     * Test basketBalance() = 2*(10**24) after removing 1 token of y type
     * Remove 2 tokens of x, we have an empty basket
     * Test basketBalance() = (10**6) after introducing 1 wei of x type
     * Test basketBalance() = (10**6)+(10**4) after introducing 1 token of y type
     */
    function basketBalance()
        public
        view
        returns (uint256)
    {
        int256 balance = 0;
        uint256 totalTokens;
        address[] memory registeredTokens;

        (registeredTokens, totalTokens) = getRegisteredTokens();

        for ( uint256 i = 0; i < totalTokens; i += 1 )
        {
            balance = FixidityLib.add(
                balance, 
                FixidityLib.newFixed(
                    // convertTokens below returns the balance in the basket decimals
                    UtilsLib.safeCast(
                        UtilsLib.convertTokenAmount(
                            getDecimals(registeredTokens[i]), 
                            ERC20Detailed(address(this)).decimals(), 
                            IERC20(registeredTokens[i]).balanceOf(address(this)))
                        ), 
                    // We create a new fixed point number from basket decimals to the
                    // library precision to be able to use the add function
                    ERC20Detailed(address(this)).decimals()
                )
            );
        }
        assert(balance >= 0);
        // We convert back from library precision to basket precision and to uint
        return uint256(FixidityLib.fromFixed(balance, ERC20Detailed(address(this)).decimals()));
    } 

    /**
     * @notice This function allows to deposit an accepted ERC20 token in 
     * exchange for MIX tokens. Transaction fees are deducted from the returned
     * amount. The MIX tokens returned are minted by this function.
     * It consists of several transactions that must be authorized by
     * the user prior to calling this function (See ERC20 transferFrom spec).
     * @param _token Address of the token to deposit.
     * @param _depositInTokenWei Amount of token wei to deposit.
     */
    function depositToken(address _token, uint256 _depositInTokenWei)
        public
        acceptedForDeposits(_token)
    {
        // Calculate the deposit fee and the returned amount
        uint256 feeInBasketWei = Fees
            .transactionFee(
                _token,
                address(this),
                _depositInTokenWei,
                Fees.DEPOSIT()
            );
        uint256 depositInBasketWei = UtilsLib.convertTokenAmount(
            getDecimals(_token), 
            ERC20Detailed(address(this)).decimals(), 
            _depositInTokenWei
        );
        uint256 returnInBasketWei = depositInBasketWei.sub(feeInBasketWei);

        // Check for minimum viable deposit
        require (
            feeInBasketWei < depositInBasketWei, 
            "Deposits at or below the minimum fee are not accepted."
        );

        // We should check for deposits that force us to mint more MIX than we want

        // Receive the token that was sent and mint an equal number of MIX
        IERC20(_token).transferFrom(msg.sender, address(this), _depositInTokenWei);
        _mint(address(this), depositInBasketWei);
        IERC20(address(this)).approve(address(this), depositInBasketWei);

        // Send the deposit fee to the stakeholder account
        IERC20(address(this)).transferFrom(address(this), stakeholderAccount, feeInBasketWei);

        // Return an equal nubmer of MIX minus the fee to sender
        IERC20(address(this)).transferFrom(address(this), msg.sender, returnInBasketWei);
    }

    /**
     * @notice This function allows to redeem MIX tokens in exhange from
     * accepted ERC20 tokens from the MIXR basket. Transaction fees are
     * deducted from the amount returned and the MIX tokens redeemed are 
     * burned.
     * @param _token Address of the token to deposit.
     * @param _redemptionInBasketWei Amount of MIX wei to redeem.
     */
    function redeemMIXR(address _token, uint256 _redemptionInBasketWei)
        public
        acceptedForRedemptions(_token)
    {

        // Calculate fee and redemption return
        uint256 redemptionInTokenWei = UtilsLib.convertTokenAmount(
            ERC20Detailed(address(this)).decimals(), 
            getDecimals(_token), 
            _redemptionInBasketWei
        );
        //
        uint256 feeInBasketWei = Fees
            .transactionFee(
                _token,
                address(this),
                redemptionInTokenWei,
                Fees.REDEMPTION()
            );
        uint256 withoutFeeInBasketWei = _redemptionInBasketWei.sub(feeInBasketWei);
        uint256 returnInTokenWei = UtilsLib.convertTokenAmount(
            ERC20Detailed(address(this)).decimals(), 
            getDecimals(_token), 
            withoutFeeInBasketWei
        );

        // Check for minimum viable redemption
        require (
            feeInBasketWei < _redemptionInBasketWei, 
            "Redemptions at or below the minimum fee are not accepted."
        );

        // Check that we have enough of _token to return
        require (
            returnInTokenWei <= IERC20(_token).balanceOf(address(this)), 
            "The MIXR doesn't have enough stablecoins for this redemption."
        );

        // Receive the MIXR token that was sent
        IERC20(address(this)).transferFrom(msg.sender, address(this), _redemptionInBasketWei);

        // Send the fee in MIX to the stakeholder account
        IERC20(address(this)).approve(address(this), feeInBasketWei);
        IERC20(address(this)).transferFrom(address(this), stakeholderAccount, feeInBasketWei);

        // Return the token equivalent to the redeemed MIX minus the fee back to the sender
        IERC20(_token).approve(address(this), returnInTokenWei);
        IERC20(_token).transferFrom(address(this), msg.sender, returnInTokenWei);
        
        // We always mint and burn MIX amounts
        _burn(address(this), withoutFeeInBasketWei);
    }

    /**
     * @dev The only objective of this method is to return an estimation
     * for the transaction. It's usefull for frontend development, but might
     * be removed in the end.
     */
    function estimateFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount, 
        int8 _transactionType
    )
        public
        view
        returns (uint256) 
    {
        return Fees.transactionFee(
            _token, 
            _basket,
            _transactionAmount, 
            _transactionType
        );
    }
}