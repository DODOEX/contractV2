/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DVMVault} from "./DVMVault.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {DODOMath} from "../../lib/DODOMath.sol";
import {IDODOCallee} from "../../intf/IDODOCallee.sol";
import {PMMPricing} from "../../lib/PMMPricing.sol";

contract DVMTrader is DVMVault {
    using SafeMath for uint256;

    // ============ Events ============

    event DODOSwap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 toAmount,
        address trader
    );

    event DODOFlashLoan(
        address borrower,
        address assetTo,
        uint256 baseAmount,
        uint256 quoteAmount
    );

    // ============ Modifiers ============

    modifier isBuyAllow(address trader) {
        require(!_BUYING_CLOSE_ && _TRADE_PERMISSION_.isAllowed(trader), "TRADER_BUY_NOT_ALLOWED");
        _;
    }

    modifier isSellAllow(address trader) {
        require(
            !_SELLING_CLOSE_ && _TRADE_PERMISSION_.isAllowed(trader),
            "TRADER_SELL_NOT_ALLOWED"
        );
        _;
    }

    modifier limitGasPrice() {
        require(tx.gasprice <= _GAS_PRICE_LIMIT_.get(), "GAS_PRICE_EXCEED");
        _;
    }

    // ============ Execute ============

    function sellBase(address to)
        external
        preventReentrant
        limitGasPrice
        isSellAllow(to) // set DVM address in trade permission
        returns (uint256 receiveQuoteAmount)
    {
        uint256 baseInput = getBaseInput();
        uint256 mtFee;
        (receiveQuoteAmount, mtFee) = querySellBase(tx.origin, baseInput);

        _transferQuoteOut(to, receiveQuoteAmount);
        _transferQuoteOut(_MAINTAINER_, mtFee);
        _sync();

        emit DODOSwap(
            address(_BASE_TOKEN_),
            address(_QUOTE_TOKEN_),
            baseInput,
            receiveQuoteAmount,
            msg.sender
        );
    }

    function sellQuote(address to)
        external
        preventReentrant
        limitGasPrice
        isBuyAllow(to)
        returns (uint256 receiveBaseAmount)
    {
        uint256 quoteInput = getQuoteInput();
        uint256 mtFee;
        (receiveBaseAmount, mtFee) = querySellQuote(tx.origin, quoteInput);

        _transferBaseOut(to, receiveBaseAmount);
        _transferBaseOut(_MAINTAINER_, mtFee);
        _sync();

        emit DODOSwap(
            address(_QUOTE_TOKEN_),
            address(_BASE_TOKEN_),
            quoteInput,
            receiveBaseAmount,
            msg.sender
        );
    }

    function flashLoan(
        uint256 baseAmount,
        uint256 quoteAmount,
        address assetTo,
        bytes calldata data
    ) external preventReentrant isSellAllow(assetTo) isBuyAllow(assetTo) {
        _transferBaseOut(assetTo, baseAmount);
        _transferQuoteOut(assetTo, quoteAmount);

        if (data.length > 0)
            IDODOCallee(assetTo).DVMFlashLoanCall(msg.sender, baseAmount, quoteAmount, data);

        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        
        // no input -> pure loss
        require(
            baseBalance >= _BASE_RESERVE_ || quoteBalance >= _QUOTE_RESERVE_,
            "FLASH_LOAN_FAILED"
        );

        // sell quote
        if (baseBalance < _BASE_RESERVE_) {
            uint256 quoteInput = quoteBalance.sub(_QUOTE_RESERVE_);
            (uint256 receiveBaseAmount, uint256 mtFee) = querySellQuote(tx.origin, quoteInput);
            require(_BASE_RESERVE_.sub(baseBalance) <= receiveBaseAmount, "FLASH_LOAN_FAILED");

            _transferBaseOut(_MAINTAINER_, mtFee);
            emit DODOSwap(
                address(_QUOTE_TOKEN_),
                address(_BASE_TOKEN_),
                quoteInput,
                receiveBaseAmount,
                tx.origin
            );
        }

        // sell base
        if (quoteBalance < _QUOTE_RESERVE_) {
            uint256 baseInput = baseBalance.sub(_BASE_RESERVE_);
            (uint256 receiveQuoteAmount, uint256 mtFee) = querySellBase(tx.origin, baseInput);
            require(_QUOTE_RESERVE_.sub(quoteBalance) <= receiveQuoteAmount, "FLASH_LOAN_FAILED");

            _transferQuoteOut(_MAINTAINER_, mtFee);
            emit DODOSwap(
                address(_BASE_TOKEN_),
                address(_QUOTE_TOKEN_),
                baseInput,
                receiveQuoteAmount,
                msg.sender
            );
        }

        _sync();
        
        emit DODOFlashLoan(msg.sender, assetTo, baseAmount, quoteAmount);
    }

    // ============ Query Functions ============

    function querySellBase(address trader, uint256 payBaseAmount)
        public
        view
        returns (uint256 receiveQuoteAmount, uint256 mtFee)
    {
        (receiveQuoteAmount, ) = PMMPricing.sellBaseToken(getPMMState(), payBaseAmount);

        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulFloor(receiveQuoteAmount, mtFeeRate);
        receiveQuoteAmount = receiveQuoteAmount
            .sub(DecimalMath.mulFloor(receiveQuoteAmount, lpFeeRate))
            .sub(mtFee);
    }

    function querySellQuote(address trader, uint256 payQuoteAmount)
        public
        view
        returns (uint256 receiveBaseAmount, uint256 mtFee)
    {
        (receiveBaseAmount, ) = PMMPricing.sellQuoteToken(getPMMState(), payQuoteAmount);

        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulFloor(receiveBaseAmount, mtFeeRate);
        receiveBaseAmount = receiveBaseAmount
            .sub(DecimalMath.mulFloor(receiveBaseAmount, lpFeeRate))
            .sub(mtFee);
    }

    // ============ Helper Functions ============

    function getPMMState() public view returns (PMMPricing.PMMState memory state) {
        state.i = _I_;
        state.K = _K_;
        state.B = _BASE_RESERVE_;
        state.Q = _QUOTE_RESERVE_;
        state.B0 = 0; // will be calculated in adjustedTarget
        state.Q0 = 0;
        state.R = PMMPricing.RState.ABOVE_ONE;
        PMMPricing.adjustedTarget(state);
    }

    function getPMMStateForCall() 
        external 
        view 
        returns (
            uint256 i,
            uint256 K,
            uint256 B,
            uint256 Q,
            uint256 B0,
            uint256 Q0,
            uint8 R
        )
    {
        PMMPricing.PMMState memory state = getPMMState();
        i = state.i;
        K = state.K;
        B = state.B;
        Q = state.Q;
        B0 = state.B0;
        Q0 = state.Q0;
        R = uint8(state.R);
    }

    function getMidPrice() public view returns (uint256 midPrice) {
        return PMMPricing.getMidPrice(getPMMState());
    }
}
