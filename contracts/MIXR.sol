pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./fixidity/FixidityLib.sol";
import "./fixidity/LogarithmLib.sol";
import "./Fees.sol";


/**
 * @title MIXR contract.
 * @dev MIXR is an ERC20 token which is created as a basket of tokens.
 * This means that in addition to the usual ERC20 features the MIXR token
 * can react to transfers of tokens other than itself.
 * TODO: Change all hardcoded "36" to a constant.
 */
contract MIXR is Fees, ERC20, ERC20Detailed {

    /**
     * @dev Constructor with the details of the ERC20.
     */
    constructor() public ERC20Detailed("MIX", "MIX", 24) {
    }

    /**
     * @dev (C11) This function allows to deposit an accepted ERC20 token
     * in exchange for some MIXR tokens.
     * It consists of several transactions that must be authorized by
     * the user prior to calling this function (See ERC20 transferFrom spec).
     */
    function depositToken(address _token, uint256 _depositInTokenWei)
        public
        isAcceptedToken(_token)
    {
        // Calculate the deposit fee and the returned amount
        uint256 feeInBasketWei = transactionFee(_token, _depositInTokenWei, DEPOSIT());
        uint256 depositInBasketWei = convertTokensAmount(
            _token, 
            address(this), 
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
     * @dev (C12) This function allows to deposit to the MIXR basket
     * an amount ERC20 token in the list, and returns a MIXR token in exchange.
     * 
     * Alberto: I would suggest that if the redeemer wants to receive
     * several different tokens that is managed from the frontend as
     * several consecutive but separate transactions.
     */
    function redeemMIXR(address _token, uint256 _redemptionInBasketWei)
        public
        isAcceptedToken(_token)
    {

        // Calculate fee and redemption return
        uint256 redemptionInTokenWei = convertTokensAmount(
            address(this), 
            _token, 
            _redemptionInBasketWei
        );
        //
        uint256 feeInBasketWei = transactionFee(_token, redemptionInTokenWei, REDEMPTION());
        uint256 withoutFeeInBasketWei = _redemptionInBasketWei.sub(feeInBasketWei);
        uint256 returnInTokenWei = convertTokensAmount(
            address(this), 
            _token, 
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
}