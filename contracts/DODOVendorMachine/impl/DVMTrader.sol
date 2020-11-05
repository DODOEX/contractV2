/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DVMStorage} from "./DVMStorage.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {DODOMath} from "../../lib/DODOMath.sol";
import {IExternalCall} from "../intf/IExternalCall.sol";

contract DVMTrader is DVMStorage {
    using SafeMath for uint256;

    function sellBase(address to) external isSellAllow(to) returns (uint256 receiveQuoteAmount) {
        uint256 baseInput = _VAULT_.getBaseInput();
        uint256 mtFee;
        (receiveQuoteAmount, mtFee) = querySellBase(to, baseInput);
        _VAULT_.transferQuoteOut(to, receiveQuoteAmount);
        if (mtFee > 0) {
            _VAULT_.transferQuoteOut(_MAINTAINER_, mtFee);
        }
        _VAULT_.sync();
        return receiveQuoteAmount;
    }

    function sellQuote(address to) external isBuyAllow(to) returns (uint256 receiveBaseAmount) {
        uint256 quoteInput = _VAULT_.getQuoteInput();
        uint256 mtFee;
        (receiveBaseAmount, mtFee) = querySellQuote(to, quoteInput);
        _VAULT_.transferBaseOut(to, receiveBaseAmount);
        if (mtFee > 0) {
            _VAULT_.transferBaseOut(_MAINTAINER_, mtFee);
        }
        _VAULT_.sync();
        return receiveBaseAmount;
    }

    function flashLoan(
        uint256 baseAmount,
        uint256 quoteAmount,
        address assetTo,
        address call,
        bytes calldata data
    ) external {
        _VAULT_.transferBaseOut(assetTo, baseAmount);
        _VAULT_.transferQuoteOut(assetTo, quoteAmount);
        IExternalCall(call).DVMCall(data);

        (uint256 baseReserve, uint256 quoteReserve) = _VAULT_.getVaultReserve();
        (uint256 baseBalance, uint256 quoteBalance) = _VAULT_.getVaultBalance();

        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(assetTo);
        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(assetTo);
        if (baseBalance < baseReserve) {
            uint256 validBaseOut = DecimalMath.divCeil(
                baseReserve - baseBalance,
                DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
            );
            baseBalance = baseReserve.sub(validBaseOut);
            _VAULT_.transferBaseOut(_MAINTAINER_, DecimalMath.mulCeil(validBaseOut, mtFeeRate));
        }
        if (quoteBalance < quoteReserve) {
            uint256 validQuoteOut = DecimalMath.divCeil(
                quoteReserve - quoteBalance,
                DecimalMath.ONE.sub(mtFeeRate).sub(lpFeeRate)
            );
            quoteBalance = quoteReserve.sub(validQuoteOut);
            _VAULT_.transferQuoteOut(_MAINTAINER_, DecimalMath.mulCeil(validQuoteOut, mtFeeRate));
        }

        require(
            calculateBase0(baseBalance, quoteBalance) >= calculateBase0(baseReserve, quoteReserve),
            "FLASH_LOAN_FAILED"
        );

        _VAULT_.sync();
    }

    function querySellBase(address trader, uint256 payBaseAmount)
        public
        view
        returns (uint256 receiveQuoteAmount, uint256 mtFee)
    {
        (uint256 baseReserve, uint256 quoteReserve) = _VAULT_.getVaultReserve();
        uint256 B0 = calculateBase0(baseReserve, quoteReserve);

        uint256 B1 = baseReserve.add(payBaseAmount);
        require(B0 >= B1, "DODO_BASE_BALANCE_NOT_ENOUGH");
        uint256 Q = DODOMath._GeneralIntegrate(B0, B1, baseReserve, _I_, _K_);

        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulCeil(Q, mtFeeRate);
        receiveQuoteAmount = Q.sub(mtFee).sub(DecimalMath.mulCeil(Q, lpFeeRate));

        return (receiveQuoteAmount, mtFee);
    }

    function querySellQuote(address trader, uint256 payQuoteAmount)
        public
        view
        returns (uint256 receiveBaseAmount, uint256 mtFee)
    {
        (uint256 baseReserve, uint256 quoteReserve) = _VAULT_.getVaultReserve();
        uint256 B0 = calculateBase0(baseReserve, quoteReserve);

        uint256 fairAmount = DecimalMath.divFloor(payQuoteAmount, _I_);
        uint256 newBaseReserve = DODOMath._SolveQuadraticFunctionForTrade(
            B0,
            baseReserve,
            fairAmount,
            false,
            _K_
        );
        uint256 deltaBase = baseReserve.sub(newBaseReserve);
        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(trader);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(trader);
        mtFee = DecimalMath.mulCeil(deltaBase, mtFeeRate);
        receiveBaseAmount = deltaBase.sub(mtFee).sub(DecimalMath.mulCeil(deltaBase, lpFeeRate));
        return (receiveBaseAmount, mtFee);
    }

    function getMidPrice() public view returns (uint256 midPrice) {
        (uint256 baseReserve, uint256 quoteReserve) = _VAULT_.getVaultReserve();
        uint256 B0 = calculateBase0(baseReserve, quoteReserve);

        uint256 offsetRatio = DecimalMath.ONE.mul(B0).div(baseReserve).mul(B0).div(baseReserve);
        uint256 offset = DecimalMath.ONE.sub(_K_).add(DecimalMath.mulFloor(offsetRatio, _K_));
        return DecimalMath.mulFloor(_I_, offset);
    }
}
