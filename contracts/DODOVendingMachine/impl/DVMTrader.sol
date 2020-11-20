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
        isSellAllow(to)
        returns (uint256 receiveQuoteAmount)
    {
        uint256 baseInput = getBaseInput();
        uint256 mtFee;
        //TODO:tx.origin 的潜在风险,直接写to
        (receiveQuoteAmount, mtFee) = querySellBase(tx.origin, baseInput);
        _transferQuoteOut(to, receiveQuoteAmount);
        _transferQuoteOut(_MAINTAINER_, mtFee);
        _sync();
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
        (receiveBaseAmount, mtFee) = querySellQuote(tx.origin, quoteInput);
        _transferBaseOut(to, receiveBaseAmount);
        _transferBaseOut(_MAINTAINER_, mtFee);
        _sync();
        return receiveBaseAmount;
    }

    // 这是一个试验性质的函数
    // 没有走标准库，需要仔细考虑下
    function flashLoan(
        uint256 baseAmount,
        uint256 quoteAmount,
        address assetTo,
        bytes calldata data
    ) external preventReentrant {
        _transferBaseOut(assetTo, baseAmount);
        _transferQuoteOut(assetTo, quoteAmount);

        if (data.length > 0)
            IDODOCallee(assetTo).DVMFlashLoanCall(msg.sender, baseAmount, quoteAmount, data);

        (uint256 baseReserve, uint256 quoteReserve) = getVaultReserve();
        (uint256 baseBalance, uint256 quoteBalance) = getVaultBalance();

        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(tx.origin);
        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(tx.origin);
        if (baseBalance < baseReserve) {
            uint256 validBaseOut = DecimalMath.divCeil(
                baseReserve - baseBalance,
                DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
            );
            baseBalance = baseReserve.sub(validBaseOut);
            _transferBaseOut(_MAINTAINER_, DecimalMath.mulCeil(validBaseOut, mtFeeRate));
        }
        if (quoteBalance < quoteReserve) {
            uint256 validQuoteOut = DecimalMath.divCeil(
                quoteReserve - quoteBalance,
                DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
            );
            quoteBalance = quoteReserve.sub(validQuoteOut);
            _transferQuoteOut(_MAINTAINER_, DecimalMath.mulCeil(validQuoteOut, mtFeeRate));
        }

        require(
            calculateBase0(baseBalance, quoteBalance) >= calculateBase0(baseReserve, quoteReserve),
            "FLASH_LOAN_FAILED"
        );

        _sync();
    }

    function querySellBase(address trader, uint256 payBaseAmount)
        public
        view
        returns (uint256 receiveQuoteAmount, uint256 mtFee)
    {
        (receiveQuoteAmount, ) = PMMPricing.sellBaseToken(getPMMState(), payBaseAmount);

        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulCeil(receiveQuoteAmount, mtFeeRate);
        receiveQuoteAmount = DecimalMath.mulFloor(
            receiveQuoteAmount,
            DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
        );

        return (receiveQuoteAmount, mtFee);
    }

    function querySellQuote(address trader, uint256 payQuoteAmount)
        public
        view
        returns (uint256 receiveBaseAmount, uint256 mtFee)
    {
        (receiveBaseAmount, ) = PMMPricing.sellQuoteToken(getPMMState(), payQuoteAmount);

        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulCeil(receiveBaseAmount, mtFeeRate);
        receiveBaseAmount = DecimalMath.mulFloor(
            receiveBaseAmount,
            DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
        );
        return (receiveBaseAmount, mtFee);
    }

    // // 这是一个仅供查询的合约，所有交易都是基于先给input，再输出output的
    // // 所以想要买10ETH，这个函数可以给你一个大概的成本，你用这个成本输入，最后能否得到10ETH是要看情况的
    // function queryBuyBase(address trader, uint256 receiveBaseAmount)
    //     public
    //     view
    //     returns (uint256 payQuoteAmount)
    // {
    //     uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
    //     uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
    //     uint256 validReceiveBaseAmount = DecimalMath.divCeil(
    //         receiveBaseAmount,
    //         DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
    //     );
    //     (uint256 baseReserve, uint256 quoteReserve) = getVaultReserve();
    //     require(baseReserve > validReceiveBaseAmount, "DODO_BASE_BALANCE_NOT_ENOUGH");

    //     uint256 B0 = calculateBase0(baseReserve, quoteReserve);
    //     uint256 B2 = baseReserve.sub(validReceiveBaseAmount);
    //     payQuoteAmount = DODOMath._GeneralIntegrate(B0, baseReserve, B2, _I_, _K_);
    //     return payQuoteAmount;
    // }

    // function queryBuyQuote(address trader, uint256 receiveQuoteAmount)
    //     public
    //     view
    //     returns (uint256 payBaseAmount)
    // {
    //     uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
    //     uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
    //     uint256 validReceiveQuoteAmount = DecimalMath.divCeil(
    //         receiveQuoteAmount,
    //         DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
    //     );
    //     (uint256 baseReserve, uint256 quoteReserve) = getVaultReserve();
    //     require(quoteReserve > validReceiveQuoteAmount, "DODO_QUOTE_BALANCE_NOT_ENOUGH");

    //     uint256 B0 = calculateBase0(baseReserve, quoteReserve);
    //     uint256 fairAmount = DecimalMath.divFloor(validReceiveQuoteAmount, _I_);
    //     payBaseAmount = DODOMath._SolveQuadraticFunctionForTrade(
    //         B0,
    //         baseReserve,
    //         fairAmount,
    //         true,
    //         _K_
    //     );
    //     return payBaseAmount;
    // }

    function getMidPrice() public view returns (uint256 midPrice) {
        (uint256 baseReserve, uint256 quoteReserve) = getVaultReserve();
        uint256 B0 = calculateBase0(baseReserve, quoteReserve);

        uint256 offsetRatio = DecimalMath.ONE.mul(B0).div(baseReserve).mul(B0).div(baseReserve);
        uint256 offset = DecimalMath.ONE.sub(_K_).add(DecimalMath.mulFloor(offsetRatio, _K_));
        return DecimalMath.mulFloor(_I_, offset);
    }

    // ============ Helper Functions ============

    function getPMMState() public view returns (PMMPricing.PMMState memory state) {
        state.i = _I_;
        state.K = _K_;
        state.B = _BASE_RESERVE_;
        state.Q = _QUOTE_RESERVE_;
        state.B0 = calculateBase0(state.B, state.Q);
        state.Q0 = 0;
        state.R = PMMPricing.RState.ABOVE_ONE;
        return state;
    }

    function calculateBase0(uint256 baseAmount, uint256 quoteAmount) public view returns (uint256) {
        uint256 fairAmount = DecimalMath.divFloor(quoteAmount, _I_);
        return DODOMath._SolveQuadraticFunctionForTarget(baseAmount, _K_, fairAmount);
    }

    function getBase0() public view returns (uint256) {
        (uint256 baseAmount, uint256 quoteAmount) = getVaultReserve();
        uint256 fairAmount = DecimalMath.divFloor(quoteAmount, _I_);
        return DODOMath._SolveQuadraticFunctionForTarget(baseAmount, _K_, fairAmount);
    }
}
