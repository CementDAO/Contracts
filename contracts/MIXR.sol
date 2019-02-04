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
    function depositToken(address _token, uint256 _amount)
        public
        isAcceptedToken(_token)
    {
        // Receive the token that was sent
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        // Send an equal number of MIXR tokens back
        int256 basketWei = convertTokensAmount(_token, address(this), _amount);
        assert(basketWei >= 0);
        _mint(address(this), uint256(basketWei));
        IERC20(address(this)).approve(address(this), uint256(basketWei));
        IERC20(address(this)).transferFrom(address(this), msg.sender, uint256(basketWei));
    }

    /**
     * @dev (C12) This function allows to deposit to the MIXR basket
     * an amount ERC20 token in the list, and returns a MIXR token in exchange.
     * 
     * Alberto: I would suggest that if the redeemer wants to receive
     * several different tokens that is managed from the frontend as
     * several consecutive but separate transactions.
     */
    function redeemMIXR(address _token, uint256 _amount)
        public
        isAcceptedToken(_token)
    {
        // Receive the MIXR token that was sent
        IERC20(address(this)).transferFrom(msg.sender, address(this), _amount);
        // Send an equal number of selected tokens back
        int256 tokenWei = convertTokensAmount(address(this), _token, _amount);
        assert(tokenWei >= 0);
        IERC20(_token).approve(address(this), uint256(tokenWei));
        IERC20(_token).transferFrom(address(this), msg.sender, uint256(tokenWei));
        // We always mint and burn MIX amounts
        _burn(address(this), _amount);
    }
}
