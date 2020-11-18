/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DPPVault} from "./DPPVault.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {RState, PMMState, PMMPricing} from "../../lib/PMMPricing.sol";

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

    // todo 看看怎么能加上flash loan

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
        RState newRState;
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
        RState newRState;
        (receiveBaseAmount, mtFee, newRState, newQuoteTarget) = querySellBase(
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

    // ============ Query Functions ============

    function querySellBase(address trader, uint256 payBaseAmount)
        public
        view
        returns (
            uint256 receiveQuoteAmount,
            uint256 mtFee,
            RState newRState,
            uint256 newBaseTarget
        )
    {
        PMMState memory state = getPMMState();
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
            RState newRState,
            uint256 newQuoteTarget
        )
    {
        PMMState memory state = getPMMState();
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

    function getPMMState() public view returns (PMMState memory state) {
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
}
