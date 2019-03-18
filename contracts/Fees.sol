pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "fixidity/contracts/FixidityLib.sol";
import "fixidity/contracts/LogarithmLib.sol";
import "./UtilsLib.sol";
import "./MIXR.sol";


/**
 * @title Fee calculation library.
 * @author Alberto Cuesta Canada, Bernardo Vieira
 * @notice Calculates the fees for deposits and redemptions according to the 
 * CementDAO whitepaper formulas, using FixidityLib for arithmetic and MIXR.sol
 * to retrieve token basket parameters.
 */
library Fees {
    using SafeMath for uint256;

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    // solium-disable-next-line mixedcase
    function REDEMPTION() public pure returns(int8) {
        return -1;
    }

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    // solium-disable-next-line mixedcase
    function TRANSFER() public pure returns(int8) {
        return 0;
    }

    /**
     * @notice Accepted transaction type for the proportion, deviation and fee
     * calculation functions.
     */
    // solium-disable-next-line mixedcase
    function DEPOSIT() public pure returns(int8) {
        return 1;
    }

    /**
     * @notice (C20) Returns what would be the proportion of a token in the basket
     * after depositing or redeeming a number of tokens. If adding, this 
     * function will throw if the amount of tokens deposited, the current token
     * balance or the basket balance are greater than FixidityLib.maxFixedAdd().
     * @param _token Address of the token to calculate the proportion for.
     * @param _basket Address of the MIXR basket.
     * @param _transactionAmount Amount to deposit or redeem in _token wei.
     * @param _transactionType Fees.DEPOSIT or Fees.REDEMPTION.
     * @return int256 A fixed point value representing the proportion in the 
     * [0,fixed1()] range.
     * @dev 
     * Testing: With an empty basket.
     * Test proportionAfterTransaction(token,1,DEPOSIT) returns fixed1
     * Introduce 1 token of x into the basket.
     * Test proportionAfterTransaction(x,basket,1,DEPOSIT) returns fixed1
     * Test proportionAfterTransaction(y,basket,1,DEPOSIT) returns fixed1/2
     * Testing: With a basket containing 2 wei each of x and y.
     * Test proportionAfterTransaction(x,basket,1,REDEMPTION) returns fixed1/2
     * Test proportionAfterTransaction(x,basket,2,REDEMPTION) returns 0
     */
    function proportionAfterTransaction(
        address _token,
        address _basket, 
        uint256 _transactionAmount, 
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        int256 tokenBalance = FixidityLib.newFixed(
            // The command below returns the balance of _token with this.decimals precision
            UtilsLib.safeCast(
                UtilsLib.convertTokenAmount(
                    MIXR(_basket).getDecimals(_token),
                    ERC20Detailed(_basket).decimals(),
                    IERC20(_token).balanceOf(_basket))
                ), 
            // We specify that this already uses a fixed point representation of decimals 
            // to convert to the library representation and be able to use the add function
            ERC20Detailed(_basket).decimals()
        );     

        int256 transactionAmount = FixidityLib.newFixed(
            UtilsLib.safeCast(
                UtilsLib.convertTokenAmount(
                    MIXR(_basket).getDecimals(_token),
                    ERC20Detailed(_basket).decimals(),
                    _transactionAmount)
                ), 
            ERC20Detailed(_basket).decimals()
        );
        // Add the token balance to the amount to deposit, in fixidity units
        int256 tokenBalanceAfterTransaction;
        if (_transactionType == DEPOSIT()) {
            require(tokenBalance < FixidityLib.maxFixedAdd(), "Token balance to high to accept deposits.");
            require(transactionAmount < FixidityLib.maxFixedAdd(), "Deposit too large, risk of overflow.");
            tokenBalanceAfterTransaction = FixidityLib.add(
                tokenBalance, 
                transactionAmount
            );
        } else if (_transactionType == REDEMPTION()) {
            require(
                transactionAmount <= tokenBalance,
                "The MIXR doesn't have enough stablecoins for this redemption."
            );
            tokenBalanceAfterTransaction = FixidityLib.subtract(
                tokenBalance, 
                transactionAmount
            );
        } else revert("Transaction type not accepted.");

        // The amount to redeem needs to be added to the basket balance to avoid
        // dividing by zero on an empty basket.
        
        int256 basketBeforeTransaction = FixidityLib.newFixed(
                UtilsLib.safeCast(MIXR(_basket).basketBalance()),
                ERC20Detailed(_basket).decimals()
        );
        int256 basketAfterTransaction;
        if (_transactionType == DEPOSIT()) {
            require(basketBeforeTransaction < FixidityLib.maxFixedAdd(), "Basket balance too high to accept deposits.");
            require(transactionAmount < FixidityLib.maxFixedAdd(), "Deposit too large, risk of overflow.");
            basketAfterTransaction = FixidityLib.add(
                basketBeforeTransaction, 
                transactionAmount
            );
        } else if (_transactionType == REDEMPTION()) {
            assert(transactionAmount <= basketBeforeTransaction);
            basketAfterTransaction = FixidityLib.subtract(
                basketBeforeTransaction, 
                transactionAmount
            );
        } // else statement does not happen here. It would have reverted above.

        int256 result = FixidityLib.divide(
            tokenBalanceAfterTransaction,
            basketAfterTransaction
        );
        
        //assert(result >= 0 && result <= FixidityLib.fixed1());
        return result;
    }

    /**
     * @notice Returns what would be the deviation from the target 
     * proportion of a token in the basket after a deposit or a redemption.
     * @param _token Address of the token to calculate the deviation for.
     * @param _basket Address of the MIXR basket.
     * @param _transactionAmount Amount to deposit or redeem in _token wei.
     * @param _transactionType Fees.DEPOSIT or Fees.REDEMPTION.
     * @return int256 A fixed point value representing the proportion in the 
     * [-fixed1(),fixed1()] range.
     * @dev
     * With an empty basket:
     * Set targetProportion of token x to 1
     * Test deviationAfterTransaction(x,basket,1,DEPOSIT) returns 1
     * Introduce 1 token of type y (not x) to the basket.
     * Test deviationAfterTransaction(x,basket,1,DEPOSIT) returns -0.5
     * Set targetProportion of token x to 0
     * Test deviationAfterTransaction(x,basket,1,DEPOSIT) returns 0.5
     */
    function deviationAfterTransaction(
        address _token,
        address _basket, 
        uint256 _transactionAmount,
        int8 _transactionType
    )
        public
        view
        returns (int256)
    {
        int256 result = FixidityLib.subtract(
            proportionAfterTransaction(
                _token,
                _basket,
                _transactionAmount,
                _transactionType
            ),
            MIXRData(_basket).getTargetProportion(_token)
        );
        assert(
            result >= FixidityLib.fixed1()*(-1) && 
            result <= FixidityLib.fixed1()
        );
        return result;
    }

    /**
     * @notice Calculates result of fee logit formula according to the whitepaper.
     * @param _targetProportion Target proportion of the token in the transaction.
     * @param _deviation Calculated deviation after the transaction.
     * @return int256 The point in the logit curve for the transaction.
     */
    function calculateLogit(
        int256 _targetProportion,
        int256 _deviation
    )
        public
        pure
        returns (int256)
    {
        // Calculate the fee following the formula from the inside out
        int256 t2 = FixidityLib.divide(
            _targetProportion,
            FixidityLib.newFixed(2)
        );
        int256 deviationCurve = FixidityLib.divide(
            FixidityLib.add(
                _deviation,
                t2
            ),
            FixidityLib.subtract(
                t2,
                _deviation
            )
        );
        return LogarithmLib.log_b(
            FixidityLib.newFixed(10),
            deviationCurve
        );
    }

    /**
     * @notice Calculates result of scaling the logit by the base fee and scaling factor. 
     * All parameters are in fixed point units.
     * @param _baseFee The deposit or redemption fee percentage.
     * @param _scalingFactor The scaling factor.
     * @param _logitPoint The result of calculating the logit on deviation.
     * @return int256 The scaled logit point.
     */
    function scaleLogit(
        int256 _baseFee,
        int256 _scalingFactor,
        int256 _logitPoint
    )
        public
        pure
        returns (int256)
    {
        return FixidityLib.multiply(
            FixidityLib.multiply(
                _baseFee,
                _scalingFactor
            ),
            _logitPoint
        );
    }

    /**
     * @notice Multiplies a transaction amount by a fee percentage.
     * @param _token Address of the token to calculate the transaction fee for.
     * @param _basket Address of the MIXR basket.
     * @param _transactionAmount Amount to deposit or redeem in _token wei.
     * @param _fee Fee in percentage form (0,inf)
     * @return uint256 Fee amount in stablecoin wei.
     */
    function applyFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount, 
        int256 _fee
    )
        public
        view
        returns(uint256)
    {
        require(_fee >= 0, "Attempted to apply a negative fee.");
        int256 validatedFee = _fee;
        if (validatedFee < MIXRData(_basket).getMinimumFee()) 
            validatedFee = MIXRData(_basket).getMinimumFee();

        int256 transactionAmount = FixidityLib.newFixed(
            UtilsLib.safeCast(_transactionAmount), 
            MIXR(_basket).getDecimals(_token)
        );

        return uint256(
            FixidityLib.fromFixed(
                FixidityLib.multiply(transactionAmount, validatedFee),
                ERC20Detailed(_basket).decimals()
            )
        );
    }

    /**
     * @notice Calculates the deposit or redemption fee as decribed in the CementDAO whitepaper.
     * @param _token Address of the token to calculate the transaction fee for.
     * @param _basket Address of the MIXR basket.
     * @param _transactionAmount Amount to deposit or redeem in _token wei.
     * @param _transactionType Fees.DEPOSIT or Fees.REDEMPTION.
     * @dev This function is not necessary but useful for a coherent syntax
     * @return uint256 The calculated fee in MIX wei.
     */
    function transactionFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount, 
        int8 _transactionType
    )
        public
        view
        returns (uint256) 
    {
        // Floors and ceilings
        if (_transactionType == DEPOSIT()) {
            return depositFee(
                _token, 
                _basket,
                _transactionAmount
            );
        } else if (_transactionType == REDEMPTION()) {
            return redemptionFee(
                _token, 
                _basket,
                _transactionAmount
            );
        } else revert("Transaction type not accepted.");
    }

    /**
     * @notice Calculates the deposit fee as decribed in the CementDAO whitepaper.
     * @param _token Address of the token to calculate the transaction fee for.
     * @param _basket Address of the MIXR basket.
     * @param _transactionAmount Amount to deposit or redeem in _token wei.
     * @return uint256 The calculated fee in MIX wei.
     */
    function depositFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount
    )
        public
        view
        returns (uint256) 
    {
        int256 deviation = deviationAfterTransaction(
            _token,
            _basket,
            _transactionAmount,
            DEPOSIT()
        );
        int256 targetProportion = MIXRData(_basket).getTargetProportion(_token);
        int256 baseFee = MIXRData(_basket).getDepositFee();
        int256 fee;

        // Floors and ceilings
        // When the deviation goes above this value the deposit is rejected
        int256 upperBound = FixidityLib.multiply(
            FixidityLib.newFixedFraction(4,10),
            targetProportion
        );
        if (deviation > upperBound)
            revert("Token not accepted, basket has too many.");
        
        // Deposits have a floor on -0.4 * targetProportion for deviation 
        int256 lowerBound = FixidityLib.multiply(
            FixidityLib.newFixedFraction(-4,10),
            targetProportion
        );
        if (deviation <= lowerBound)
            deviation = lowerBound;
        
        // Calculate the fee following the formula from the inside out
        int256 logitPoint = calculateLogit(targetProportion, deviation);
        int256 scaledLogit = scaleLogit(
            baseFee,
            MIXRData(_basket).getScalingFactor(),
            logitPoint
        );

        fee = FixidityLib.add(
            baseFee,
            scaledLogit
        );

        return applyFee(
            _token, 
            _basket,
            _transactionAmount, 
            fee
        );
    }

        /**
     * @notice Calculates the redemption fee as decribed in the CementDAO whitepaper.
     * @param _token Address of the token to calculate the transaction fee for.
     * @param _basket Address of the MIXR basket.
     * @param _transactionAmount Amount to deposit or redeem in _token wei.
     * TODO: redemptionFee should take the _transactionAmount in MIX wei. 
     * Right now anyone calling this function needs to convert to token wei first, which doesn't make sense
     * @return uint256 The calculated fee in MIX wei.
     */
    function redemptionFee(
        address _token, 
        address _basket,
        uint256 _transactionAmount
    )
        public
        view
        returns (uint256) 
    {
        int256 deviation = deviationAfterTransaction(
            _token,
            _basket,
            _transactionAmount,
            REDEMPTION()
        );
        int256 targetProportion = MIXRData(_basket).getTargetProportion(_token);
        int256 baseFee = MIXRData(_basket).getRedemptionFee();
        int256 fee;

        // Floors and ceilings
        // Redemptions have a ceiling on 0.4 * targetProportion for deviation
        int256 upperBound = FixidityLib.multiply(
            FixidityLib.newFixedFraction(4,10),
            targetProportion
        );
        if (deviation > upperBound)
            deviation = upperBound;

        // Redemptions have a floor on -0.4999 * targetProportion for deviation
        int256 lowerBound = FixidityLib.multiply(
            FixidityLib.newFixedFraction(-4999,10000),
            targetProportion
        );
        if (deviation < lowerBound)
            deviation = lowerBound;
        // Redemptions when no tokens are in the basket are managed by the redeemMIX function
        
        // Calculate the fee following the formula from the inside out
        int256 logitPoint = calculateLogit(targetProportion, deviation);

        int256 scaledLogit = scaleLogit(
            baseFee,
            MIXRData(_basket).getScalingFactor(),
            logitPoint
        );

        fee = FixidityLib.subtract(
            baseFee,
            scaledLogit
        );

        return applyFee(
            _token, 
            _basket,
            _transactionAmount, 
            fee
        );
    }
}
