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

contract DVMTrader is DVMStorage {
    using SafeMath for uint256;

    function sellBase(address to) external returns (uint256 receiveQuoteAmount) {
        uint256 baseInput = _VAULT_.getBaseInput();
        uint256 mtFee;
        (receiveQuoteAmount, mtFee) = querySellBase(baseInput);
        _VAULT_.transferQuoteOut(to, receiveQuoteAmount);
        if (mtFee > 0) {
            _VAULT_.transferQuoteOut(_MAINTAINER_, mtFee);
        }
        _VAULT_.sync();
        _updateBase0(); // 这里需要想想，原则上不需要update B0. 但精度问题，或者用户往合约里充值，可能导致需要updateBase0
        return receiveQuoteAmount;
    }

    function sellQuote(address to) external returns (uint256 receiveBaseAmount) {
        uint256 quoteInput = _VAULT_.getQuoteInput();
        uint256 mtFee;
        (receiveBaseAmount, mtFee) = querySellQuote(quoteInput);
        _VAULT_.transferBaseOut(to, receiveBaseAmount);
        if (mtFee > 0) {
            _VAULT_.transferBaseOut(_MAINTAINER_, mtFee);
        }
        _VAULT_.sync();
        _updateBase0();
        return receiveBaseAmount;
    }

    function querySellBase(uint256 payBaseAmount)
        public
        view
        returns (uint256 receiveQuoteAmount, uint256 mtFee)
    {
        uint256 B2 = _VAULT_._BASE_RESERVE_();
        uint256 B1 = B2.add(payBaseAmount);
        require(_BASE0_ >= B1, "DODO_BASE_BALANCE_NOT_ENOUGH");
        uint256 Q = DODOMath._GeneralIntegrate(_BASE0_, B1, B2, _I_, _K_);
        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(Q);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(Q);
        mtFee = DecimalMath.mulCeil(Q, mtFeeRate);
        receiveQuoteAmount = Q.sub(mtFee).sub(DecimalMath.mulCeil(Q, lpFeeRate));
        return (receiveQuoteAmount, mtFee);
    }

    function querySellQuote(uint256 payQuoteAmount)
        public
        view
        returns (uint256 receiveBaseAmount, uint256 mtFee)
    {
        uint256 B1 = _VAULT_._BASE_RESERVE_();
        uint256 fairAmount = DecimalMath.divFloor(payQuoteAmount, _I_);
        uint256 newBaseReserve = DODOMath._SolveQuadraticFunctionForTrade(
            _BASE0_,
            B1,
            fairAmount,
            false,
            _K_
        );
        uint256 deltaBase = B1.sub(newBaseReserve);
        uint256 lpFeeRate = _LP_FEE_RATE_MODEL_.getFeeRate(payQuoteAmount);
        uint256 mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(payQuoteAmount);
        mtFee = DecimalMath.mulCeil(deltaBase, mtFeeRate);
        receiveBaseAmount = deltaBase.sub(mtFee).sub(DecimalMath.mulCeil(deltaBase, lpFeeRate));
        return (receiveBaseAmount, mtFee);
    }
}
