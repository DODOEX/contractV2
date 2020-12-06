/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../../lib/SafeMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IDODOCallee} from "../../intf/IDODOCallee.sol";
import {CAStorage} from "./CAStorage.sol";
import {PMMPricing} from "../../lib/PMMPricing.sol";

contract CAFunding is CAStorage {
    using SafeERC20 for IERC20;

    // ============ BID ============

    function bid(address to) external phaseBid preventReentrant {
        uint256 input = _getQuoteInput();
        _QUOTE_SHARES_[to] = _QUOTE_SHARES_[to].add(input);
        _TOTAL_QUOTE_SHARES_ = _TOTAL_QUOTE_SHARES_.add(input);
        _sync();
    }

    // ============ CALM ============

    function cancel(
        address to,
        uint256 amount,
        bytes memory data
    ) external phaseBidOrCalm preventReentrant {
        require(_QUOTE_SHARES_[msg.sender] >= amount, "SHARES_NOT_ENOUGH");
        _QUOTE_SHARES_[msg.sender] = _QUOTE_SHARES_[msg.sender].sub(amount);
        _transferQuoteOut(to, amount);
        _sync();
        if (data.length > 0) {
            IDODOCallee(to).CACancelCall(msg.sender, amount, data);
        }
    }

    // ============ SETTLEMENT ============

    function settle() external phaseSettlement preventReentrant {
        require(!_SETTLED_, "ALREADY_SETTLED");
        _SETTLED_ = true;

        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 mtFee;
        (_TOTAL_SOLD_BASE_, mtFee) = getBaseSold();

        // 1. maintainer quote
        _transferQuoteOut(_MAINTAINER_, mtFee);
        // 2. remaining quote
        _transferQuoteOut(_QUOTE_PAY_BACK_, quoteBalance.sub(mtFee));
        // 3. base token pay back
        _transferBaseOut(_BASE_PAY_BACK_, baseBalance.sub(_TOTAL_SOLD_BASE_));
        // 4. left base in contract
        // 5. external call
        if (_BASE_PAY_BACK_CALL_DATA_.length > 0) {
            (bool success, ) = _BASE_PAY_BACK_.call(_BASE_PAY_BACK_CALL_DATA_);
            require(success, "BASE_PAY_BACK_CALL_FAILED");
        }
        if (_QUOTE_PAY_BACK_CALL_DATA_.length > 0) {
            (bool success, ) = _QUOTE_PAY_BACK_.call(_QUOTE_PAY_BACK_CALL_DATA_);
            require(success, "QUOTE_PAY_BACK_CALL_FAILED");
        }
    }

    // ============ Pricing ============

    function getAvgPrice() public view returns (uint256 avgPrice) {
        (uint256 baseSold, ) = getBaseSold();
        avgPrice = DecimalMath.divFloor(_QUOTE_TOKEN_.balanceOf(address(this)), baseSold);
    }

    function getBaseByUser(address user) public view returns (uint256 baseAmount) {
        (uint256 baseSold, ) = getBaseSold();
        baseAmount = baseSold.mul(_QUOTE_SHARES_[user]).div(_TOTAL_QUOTE_SHARES_);
    }

    function getBaseSold() public view returns (uint256 baseSold, uint256 mtFee) {
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        mtFee = DecimalMath.mulFloor(quoteBalance, _QUOTE_MAINTAINER_FEE_RATE_);
        (baseSold, ) = PMMPricing.sellQuoteToken(_getPMMState(), quoteBalance);
    }

    function _getPMMState() internal view returns (PMMPricing.PMMState memory state) {
        state.i = _I_;
        state.K = _K_;
        state.B = _BASE_TOKEN_.balanceOf(address(this));
        state.Q = 0;
        state.B0 = state.B;
        state.Q0 = 0;
        state.R = PMMPricing.RState.ONE;
    }

    // ============ Asset In ============

    function _getQuoteInput() internal view returns (uint256 input) {
        return _QUOTE_TOKEN_.balanceOf(address(this)).sub(_QUOTE_RESERVE_);
    }

    // ============ Set States ============

    function _sync() internal {
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        if (quoteBalance != _QUOTE_RESERVE_) {
            _QUOTE_RESERVE_ = quoteBalance;
        }
    }

    // ============ Asset Out ============

    function _transferBaseOut(address to, uint256 amount) internal {
        if (amount > 0) {
            _BASE_TOKEN_.safeTransfer(to, amount);
        }
    }

    function _transferQuoteOut(address to, uint256 amount) internal {
        if (amount > 0) {
            _QUOTE_TOKEN_.safeTransfer(to, amount);
        }
    }
}
