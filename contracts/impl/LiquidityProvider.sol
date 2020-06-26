/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {DODOMath} from "../lib/DODOMath.sol";
import {Types} from "../lib/Types.sol";
import {IDODOLpToken} from "../intf/IDODOLpToken.sol";
import {Storage} from "./Storage.sol";
import {Settlement} from "./Settlement.sol";
import {Pricing} from "./Pricing.sol";

/**
 * @title LiquidityProvider
 * @author DODO Breeder
 *
 * @notice Functions for liquidity provider operations
 */
contract LiquidityProvider is Storage, Pricing, Settlement {
    using SafeMath for uint256;

    // ============ Events ============

    event DepositBaseToken(address indexed payer, address indexed receiver, uint256 amount);

    event DepositQuoteToken(address indexed payer, address indexed receiver, uint256 amount);

    event WithdrawBaseToken(address indexed payer, address indexed receiver, uint256 amount);

    event WithdrawQuoteToken(address indexed payer, address indexed receiver, uint256 amount);

    event ChargeBasePenalty(address indexed payer, uint256 amount);

    event ChargeQuotePenalty(address indexed payer, uint256 amount);

    // ============ Modifiers ============

    modifier depositQuoteAllowed() {
        require(_DEPOSIT_QUOTE_ALLOWED_, "DEPOSIT_QUOTE_TOKEN_NOT_ALLOWED");
        _;
    }

    modifier depositBaseAllowed() {
        require(_DEPOSIT_BASE_ALLOWED_, "DEPOSIT_BASE_TOKEN_NOT_ALLOWED");
        _;
    }

    // ============ Routine Functions ============

    function withdrawBase(uint256 amount) external returns (uint256) {
        return withdrawBaseTo(msg.sender, amount);
    }

    function depositBase(uint256 amount) external {
        depositBaseTo(msg.sender, amount);
    }

    function withdrawQuote(uint256 amount) external returns (uint256) {
        return withdrawQuoteTo(msg.sender, amount);
    }

    function depositQuote(uint256 amount) external {
        depositQuoteTo(msg.sender, amount);
    }

    function withdrawAllBase() external returns (uint256) {
        return withdrawAllBaseTo(msg.sender);
    }

    function withdrawAllQuote() external returns (uint256) {
        return withdrawAllQuoteTo(msg.sender);
    }

    // ============ Deposit Functions ============

    function depositQuoteTo(address to, uint256 amount)
        public
        preventReentrant
        depositQuoteAllowed
    {
        (, uint256 quoteTarget) = _getExpectedTarget();
        uint256 totalQuoteCapital = getTotalQuoteCapital();
        uint256 capital = amount;
        if (totalQuoteCapital == 0) {
            // give remaining quote token to lp as a gift
            capital = amount.add(quoteTarget);
        } else if (quoteTarget > 0) {
            capital = amount.mul(totalQuoteCapital).div(quoteTarget);
        }

        // settlement
        _quoteTokenTransferIn(msg.sender, amount);
        _mintQuoteCapital(to, capital);
        _TARGET_QUOTE_TOKEN_AMOUNT_ = _TARGET_QUOTE_TOKEN_AMOUNT_.add(amount);

        emit DepositQuoteToken(msg.sender, to, amount);
    }

    function depositBaseTo(address to, uint256 amount) public preventReentrant depositBaseAllowed {
        (uint256 baseTarget, ) = _getExpectedTarget();
        uint256 totalBaseCapital = getTotalBaseCapital();
        uint256 capital = amount;
        if (totalBaseCapital == 0) {
            // give remaining base token to lp as a gift
            capital = amount.add(baseTarget);
        } else if (baseTarget > 0) {
            capital = amount.mul(totalBaseCapital).div(baseTarget);
        }

        // settlement
        _baseTokenTransferIn(msg.sender, amount);
        _mintBaseCapital(to, capital);
        _TARGET_BASE_TOKEN_AMOUNT_ = _TARGET_BASE_TOKEN_AMOUNT_.add(amount);

        emit DepositBaseToken(msg.sender, to, amount);
    }

    // ============ Withdraw Functions ============

    function withdrawQuoteTo(address to, uint256 amount) public preventReentrant returns (uint256) {
        // calculate capital
        (, uint256 quoteTarget) = _getExpectedTarget();
        uint256 totalQuoteCapital = getTotalQuoteCapital();
        require(totalQuoteCapital > 0, "NO_QUOTE_LP");

        uint256 requireQuoteCapital = amount.mul(totalQuoteCapital).divCeil(quoteTarget);
        require(
            requireQuoteCapital <= getQuoteCapitalBalanceOf(msg.sender),
            "LP_QUOTE_CAPITAL_BALANCE_NOT_ENOUGH"
        );

        // handle penalty, penalty may exceed amount
        uint256 penalty = getWithdrawQuotePenalty(amount);
        require(penalty < amount, "COULD_NOT_AFFORD_LIQUIDITY_PENALTY");

        // settlement
        _TARGET_QUOTE_TOKEN_AMOUNT_ = _TARGET_QUOTE_TOKEN_AMOUNT_.sub(amount);
        _burnQuoteCapital(msg.sender, requireQuoteCapital);
        _quoteTokenTransferOut(to, amount.sub(penalty));
        _donateQuoteToken(penalty);

        emit WithdrawQuoteToken(msg.sender, to, amount.sub(penalty));
        emit ChargeQuotePenalty(msg.sender, penalty);

        return amount.sub(penalty);
    }

    function withdrawBaseTo(address to, uint256 amount) public preventReentrant returns (uint256) {
        // calculate capital
        (uint256 baseTarget, ) = _getExpectedTarget();
        uint256 totalBaseCapital = getTotalBaseCapital();
        require(totalBaseCapital > 0, "NO_BASE_LP");

        uint256 requireBaseCapital = amount.mul(totalBaseCapital).divCeil(baseTarget);
        require(
            requireBaseCapital <= getBaseCapitalBalanceOf(msg.sender),
            "LP_BASE_CAPITAL_BALANCE_NOT_ENOUGH"
        );

        // handle penalty, penalty may exceed amount
        uint256 penalty = getWithdrawBasePenalty(amount);
        require(penalty <= amount, "COULD_NOT_AFFORD_LIQUIDITY_PENALTY");

        // settlement
        _TARGET_BASE_TOKEN_AMOUNT_ = _TARGET_BASE_TOKEN_AMOUNT_.sub(amount);
        _burnBaseCapital(msg.sender, requireBaseCapital);
        _baseTokenTransferOut(to, amount.sub(penalty));
        _donateBaseToken(penalty);

        emit WithdrawBaseToken(msg.sender, to, amount.sub(penalty));
        emit ChargeBasePenalty(msg.sender, penalty);

        return amount.sub(penalty);
    }

    // ============ Withdraw all Functions ============

    function withdrawAllQuoteTo(address to) public preventReentrant returns (uint256) {
        uint256 withdrawAmount = getLpQuoteBalance(msg.sender);

        // handle penalty, penalty may exceed amount
        uint256 penalty = getWithdrawQuotePenalty(withdrawAmount);
        require(penalty <= withdrawAmount, "COULD_NOT_AFFORD_LIQUIDITY_PENALTY");

        // settlement
        _TARGET_QUOTE_TOKEN_AMOUNT_ = _TARGET_QUOTE_TOKEN_AMOUNT_.sub(withdrawAmount);
        _burnQuoteCapital(msg.sender, getQuoteCapitalBalanceOf(msg.sender));
        _quoteTokenTransferOut(to, withdrawAmount.sub(penalty));
        _donateQuoteToken(penalty);

        emit WithdrawQuoteToken(msg.sender, to, withdrawAmount);
        emit ChargeQuotePenalty(msg.sender, penalty);

        return withdrawAmount.sub(penalty);
    }

    function withdrawAllBaseTo(address to) public preventReentrant returns (uint256) {
        uint256 withdrawAmount = getLpBaseBalance(msg.sender);

        // handle penalty, penalty may exceed amount
        uint256 penalty = getWithdrawBasePenalty(withdrawAmount);
        require(penalty <= withdrawAmount, "COULD_NOT_AFFORD_LIQUIDITY_PENALTY");

        // settlement
        _TARGET_BASE_TOKEN_AMOUNT_ = _TARGET_BASE_TOKEN_AMOUNT_.sub(withdrawAmount);
        _burnBaseCapital(msg.sender, getBaseCapitalBalanceOf(msg.sender));
        _baseTokenTransferOut(to, withdrawAmount.sub(penalty));
        _donateBaseToken(penalty);

        emit WithdrawBaseToken(msg.sender, to, withdrawAmount);
        emit ChargeBasePenalty(msg.sender, penalty);

        return withdrawAmount.sub(penalty);
    }

    // ============ Helper Functions ============

    function _mintBaseCapital(address user, uint256 amount) internal {
        IDODOLpToken(_BASE_CAPITAL_TOKEN_).mint(user, amount);
    }

    function _mintQuoteCapital(address user, uint256 amount) internal {
        IDODOLpToken(_QUOTE_CAPITAL_TOKEN_).mint(user, amount);
    }

    function _burnBaseCapital(address user, uint256 amount) internal {
        IDODOLpToken(_BASE_CAPITAL_TOKEN_).burn(user, amount);
    }

    function _burnQuoteCapital(address user, uint256 amount) internal {
        IDODOLpToken(_QUOTE_CAPITAL_TOKEN_).burn(user, amount);
    }

    // ============ Getter Functions ============

    function getLpBaseBalance(address lp) public view returns (uint256 lpBalance) {
        uint256 totalBaseCapital = getTotalBaseCapital();
        (uint256 baseTarget, ) = _getExpectedTarget();
        if (totalBaseCapital == 0) {
            return 0;
        }
        lpBalance = getBaseCapitalBalanceOf(lp).mul(baseTarget).div(totalBaseCapital);
        return lpBalance;
    }

    function getLpQuoteBalance(address lp) public view returns (uint256 lpBalance) {
        uint256 totalQuoteCapital = getTotalQuoteCapital();
        (, uint256 quoteTarget) = _getExpectedTarget();
        if (totalQuoteCapital == 0) {
            return 0;
        }
        lpBalance = getQuoteCapitalBalanceOf(lp).mul(quoteTarget).div(totalQuoteCapital);
        return lpBalance;
    }

    function getWithdrawQuotePenalty(uint256 amount) public view returns (uint256 penalty) {
        require(amount <= _QUOTE_BALANCE_, "DODO_QUOTE_TOKEN_BALANCE_NOT_ENOUGH");
        if (_R_STATUS_ == Types.RStatus.BELOW_ONE) {
            uint256 spareBase = _BASE_BALANCE_.sub(_TARGET_BASE_TOKEN_AMOUNT_);
            uint256 price = getOraclePrice();
            uint256 fairAmount = DecimalMath.mul(spareBase, price);
            uint256 targetQuote = DODOMath._SolveQuadraticFunctionForTarget(
                _QUOTE_BALANCE_,
                _K_,
                fairAmount
            );
            // if amount = _QUOTE_BALANCE_, div error
            uint256 targetQuoteWithWithdraw = DODOMath._SolveQuadraticFunctionForTarget(
                _QUOTE_BALANCE_.sub(amount),
                _K_,
                fairAmount
            );
            return targetQuote.sub(targetQuoteWithWithdraw.add(amount));
        } else {
            return 0;
        }
    }

    function getWithdrawBasePenalty(uint256 amount) public view returns (uint256 penalty) {
        require(amount <= _BASE_BALANCE_, "DODO_BASE_TOKEN_BALANCE_NOT_ENOUGH");
        if (_R_STATUS_ == Types.RStatus.ABOVE_ONE) {
            uint256 spareQuote = _QUOTE_BALANCE_.sub(_TARGET_QUOTE_TOKEN_AMOUNT_);
            uint256 price = getOraclePrice();
            uint256 fairAmount = DecimalMath.divFloor(spareQuote, price);
            uint256 targetBase = DODOMath._SolveQuadraticFunctionForTarget(
                _BASE_BALANCE_,
                _K_,
                fairAmount
            );
            // if amount = _BASE_BALANCE_, div error
            uint256 targetBaseWithWithdraw = DODOMath._SolveQuadraticFunctionForTarget(
                _BASE_BALANCE_.sub(amount),
                _K_,
                fairAmount
            );
            return targetBase.sub(targetBaseWithWithdraw.add(amount));
        } else {
            return 0;
        }
    }
}
