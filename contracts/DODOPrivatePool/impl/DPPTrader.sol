/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DPPVault} from "./DPPVault.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {PMMPricing} from "../../lib/PMMPricing.sol";
import {IDODOCallee} from "../../intf/IDODOCallee.sol";

contract DPPTrader is DPPVault {
    using SafeMath for uint256;

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

    // ============ Trade Functions ============

    function sellBase(address to)
        external
        preventReentrant
        limitGasPrice
        isSellAllow(to)
        returns (uint256 receiveQuoteAmount)
    {
        uint256 baseInput = getBaseInput();
        uint256 mtFee;
        uint256 newBaseTarget;
        PMMPricing.RState newRState;
        (receiveQuoteAmount, mtFee, newRState, newBaseTarget) = querySellBase(tx.origin, baseInput);

        _transferQuoteOut(to, receiveQuoteAmount);
        _transferQuoteOut(_MAINTAINER_, mtFee);

        // update TARGET
        if (_RState_ != newRState) {
            _RState_ = newRState;
            _BASE_TARGET_ = newBaseTarget;
        }

        _syncReserve();

        return receiveQuoteAmount;
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
        uint256 newQuoteTarget;

        PMMPricing.RState newRState;
        (receiveBaseAmount, mtFee, newRState, newQuoteTarget) = querySellQuote(
            tx.origin,
            quoteInput
        );

        _transferBaseOut(to, receiveBaseAmount);
        _transferBaseOut(_MAINTAINER_, mtFee);

        // update TARGET
        if (_RState_ != newRState) {
            _RState_ = newRState;
            _QUOTE_TARGET_ = newQuoteTarget;
        }

        _syncReserve();

        return receiveBaseAmount;
    }

    function flashLoan(
        uint256 baseAmount,
        uint256 quoteAmount,
        address assetTo,
        bytes calldata data
    ) external preventReentrant {
        _transferBaseOut(assetTo, baseAmount);
        _transferQuoteOut(assetTo, quoteAmount);
        if (data.length > 0)
            IDODOCallee(assetTo).DPPFlashLoanCall(msg.sender, baseAmount, quoteAmount, data);

        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));

        // no input -> pure loss
        require(
            baseBalance >= _BASE_RESERVE_ || quoteBalance >= _QUOTE_RESERVE_,
            "FLASH_LOAN_FAILED"
        );

        // no output -> pure profit
        if (baseBalance >= _BASE_RESERVE_ && quoteBalance >= _QUOTE_RESERVE_) return;

        // sell quote case
        // quote input + base output
        if (baseBalance < _BASE_RESERVE_) {
            (
                uint256 receiveBaseAmount,
                uint256 mtFee,
                PMMPricing.RState newRState,
                uint256 newQuoteTarget
            ) = querySellQuote(tx.origin, quoteBalance.sub(_QUOTE_RESERVE_)); // revert if quoteBalance<quoteReserve

            require(_BASE_RESERVE_.sub(baseBalance) <= receiveBaseAmount, "FLASH_LOAN_FAILED");

            _transferBaseOut(_MAINTAINER_, mtFee);
            if (_RState_ != newRState) {
                _RState_ = newRState;
                _QUOTE_TARGET_ = newQuoteTarget;
            }

            _syncReserve();
        }

        // sell base case
        // base input + quote output
        if (quoteBalance < _QUOTE_RESERVE_) {
            (
                uint256 receiveQuoteAmount,
                uint256 mtFee,
                PMMPricing.RState newRState,
                uint256 newBaseTarget
            ) = querySellBase(tx.origin, baseBalance.sub(_BASE_RESERVE_)); // revert if baseBalance<baseReserve

            require(_QUOTE_RESERVE_.sub(quoteBalance) <= receiveQuoteAmount, "FLASH_LOAN_FAILED");

            _transferQuoteOut(_MAINTAINER_, mtFee);
            if (_RState_ != newRState) {
                _RState_ = newRState;
                _BASE_TARGET_ = newBaseTarget;
            }

            _syncReserve();
        }
    }

    // ============ Query Functions ============

    function querySellBase(address trader, uint256 payBaseAmount)
        public
        view
        returns (
            uint256 receiveQuoteAmount,
            uint256 mtFee,
            PMMPricing.RState newRState,
            uint256 newBaseTarget
        )
    {
        PMMPricing.PMMState memory state = getPMMState();
        (receiveQuoteAmount, newRState) = PMMPricing.sellBaseToken(state, payBaseAmount);

        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulCeil(receiveQuoteAmount, mtFeeRate);
        receiveQuoteAmount = DecimalMath.mulFloor(
            receiveQuoteAmount,
            DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
        );

        return (receiveQuoteAmount, mtFee, newRState, state.B0);
    }

    function querySellQuote(address trader, uint256 payQuoteAmount)
        public
        view
        returns (
            uint256 receiveBaseAmount,
            uint256 mtFee,
            PMMPricing.RState newRState,
            uint256 newQuoteTarget
        )
    {
        PMMPricing.PMMState memory state = getPMMState();
        (receiveBaseAmount, newRState) = PMMPricing.sellQuoteToken(state, payQuoteAmount);

        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulCeil(receiveBaseAmount, mtFeeRate);
        receiveBaseAmount = DecimalMath.mulFloor(
            receiveBaseAmount,
            DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
        );
        return (receiveBaseAmount, mtFee, newRState, state.Q0);
    }

    // ============ Helper Functions ============

    function getPMMState() public view returns (PMMPricing.PMMState memory state) {
        state.i = _I_.get();
        state.K = _K_.get();
        state.B = _BASE_RESERVE_;
        state.Q = _QUOTE_RESERVE_;
        state.B0 = _BASE_TARGET_;
        state.Q0 = _QUOTE_TARGET_;
        state.R = _RState_;
        PMMPricing.adjustedTarget(state);
        return state;
    }

    function getMidPrice() public view returns (uint256 midPrice) {
        return PMMPricing.getMidPrice(getPMMState());
    }

    function _syncReserve() internal {
        _BASE_RESERVE_ = _BASE_TOKEN_.balanceOf(address(this));
        _QUOTE_RESERVE_ = _QUOTE_TOKEN_.balanceOf(address(this));
    }
}
