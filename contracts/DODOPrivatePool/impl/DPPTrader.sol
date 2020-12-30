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

    event RChange(PMMPricing.RState newRState);

    // ============ Trade Functions ============

    function sellBase(address to)
        external
        preventReentrant
        returns (uint256 receiveQuoteAmount)
    {
        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 baseInput = baseBalance.sub(uint256(_BASE_RESERVE_));
        uint256 mtFee;
        uint256 newBaseTarget;
        PMMPricing.RState newRState;
        (receiveQuoteAmount, mtFee, newRState, newBaseTarget) = querySellBase(tx.origin, baseInput);

        _transferQuoteOut(to, receiveQuoteAmount);
        _transferQuoteOut(_MAINTAINER_, mtFee);
        _setReserve(baseBalance, _QUOTE_TOKEN_.balanceOf(address(this)));

        // update TARGET
        if (_RState_ != uint16(newRState)) {
            _RState_ = uint16(newRState);
            require(newBaseTarget <= uint120(-1),"OVERFLOW");
            _BASE_TARGET_ = uint120(newBaseTarget);
            emit RChange(newRState);
        }

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
        returns (uint256 receiveBaseAmount)
    {
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        uint256 quoteInput = quoteBalance.sub(uint256(_QUOTE_RESERVE_));
        uint256 mtFee;
        uint256 newQuoteTarget;
        PMMPricing.RState newRState;
        (receiveBaseAmount, mtFee, newRState, newQuoteTarget) = querySellQuote(
            tx.origin,
            quoteInput
        );

        _transferBaseOut(to, receiveBaseAmount);
        _transferBaseOut(_MAINTAINER_, mtFee);
         _setReserve(_BASE_TOKEN_.balanceOf(address(this)), quoteBalance);

        // update TARGET
        if (_RState_ != uint16(newRState)) {
            _RState_ = uint16(newRState);
            require(newQuoteTarget <= uint120(-1),"OVERFLOW");
            _QUOTE_TARGET_ = uint120(newQuoteTarget);
            emit RChange(newRState);
        }

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

        // sell quote case
        // quote input + base output
        if (baseBalance < _BASE_RESERVE_) {
            uint256 quoteInput = quoteBalance.sub(uint256(_QUOTE_RESERVE_));
            (
                uint256 receiveBaseAmount,
                uint256 mtFee,
                PMMPricing.RState newRState,
                uint256 newQuoteTarget
            ) = querySellQuote(tx.origin, quoteInput); // revert if quoteBalance<quoteReserve
            require(uint256(_BASE_RESERVE_).sub(baseBalance) <= receiveBaseAmount, "FLASH_LOAN_FAILED");

            _transferBaseOut(_MAINTAINER_, mtFee);
            if (_RState_ != uint16(newRState)) {
                _RState_ = uint16(newRState);
                require(newQuoteTarget <= uint120(-1),"OVERFLOW");
                _QUOTE_TARGET_ = uint120(newQuoteTarget);
                emit RChange(newRState);
            }
            emit DODOSwap(
                address(_QUOTE_TOKEN_),
                address(_BASE_TOKEN_),
                quoteInput,
                receiveBaseAmount,
                msg.sender
            );
        }

        // sell base case
        // base input + quote output
        if (quoteBalance < _QUOTE_RESERVE_) {
            uint256 baseInput = baseBalance.sub(uint256(_BASE_RESERVE_));
            (
                uint256 receiveQuoteAmount,
                uint256 mtFee,
                PMMPricing.RState newRState,
                uint256 newBaseTarget
            ) = querySellBase(tx.origin, baseInput); // revert if baseBalance<baseReserve
            require(uint256(_QUOTE_RESERVE_).sub(quoteBalance) <= receiveQuoteAmount, "FLASH_LOAN_FAILED");

            _transferQuoteOut(_MAINTAINER_, mtFee);
            if (_RState_ != uint16(newRState)) {
                _RState_ = uint16(newRState);
                require(newBaseTarget <= uint120(-1),"OVERFLOW");
                _BASE_TARGET_ = uint120(newBaseTarget);
                emit RChange(newRState);
            }
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
        returns (
            uint256 receiveQuoteAmount,
            uint256 mtFee,
            PMMPricing.RState newRState,
            uint256 newBaseTarget
        )
    {
        PMMPricing.PMMState memory state = getPMMState();
        (receiveQuoteAmount, newRState) = PMMPricing.sellBaseToken(state, payBaseAmount);

        uint256 lpFeeRate = _LP_FEE_RATE_;
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulFloor(receiveQuoteAmount, mtFeeRate);
        receiveQuoteAmount = receiveQuoteAmount
            .sub(DecimalMath.mulFloor(receiveQuoteAmount, lpFeeRate))
            .sub(mtFee);
        newBaseTarget = state.B0;
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

        uint256 lpFeeRate = _LP_FEE_RATE_;
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulFloor(receiveBaseAmount, mtFeeRate);
        receiveBaseAmount = receiveBaseAmount
            .sub(DecimalMath.mulFloor(receiveBaseAmount, lpFeeRate))
            .sub(mtFee);
        newQuoteTarget = state.Q0;
    }

    // ============ Helper Functions ============

    function getPMMState() public view returns (PMMPricing.PMMState memory state) {
        state.i = _I_;
        state.K = _K_;
        state.B = _BASE_RESERVE_;
        state.Q = _QUOTE_RESERVE_;
        state.B0 = _BASE_TARGET_;
        state.Q0 = _QUOTE_TARGET_;
        state.R = PMMPricing.RState(_RState_);
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
            uint256 R
        )
    {
        PMMPricing.PMMState memory state = getPMMState();
        i = state.i;
        K = state.K;
        B = state.B;
        Q = state.Q;
        B0 = state.B0;
        Q0 = state.Q0;
        R = uint256(state.R);
    }

    function getMidPrice() public view returns (uint256 midPrice) {
        return PMMPricing.getMidPrice(getPMMState());
    }
}
