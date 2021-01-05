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
import {IDVM} from "../../DODOVendingMachine/intf/IDVM.sol";
import {IDVMFactory} from "../../Factory/DVMFactory.sol";
import {CPStorage} from "./CPStorage.sol";
import {PMMPricing} from "../../lib/PMMPricing.sol";

contract CPFunding is CPStorage {
    using SafeERC20 for IERC20;
    // ============ Events ============
    event Bid(address to, uint256 amount, uint256 fee);
    event Cancel(address to,uint256 amount);

    // ============ BID & CALM PHASE ============

    modifier isBidderAllow(address bidder) {
        require(_BIDDER_PERMISSION_.isAllowed(bidder), "BIDDER_NOT_ALLOWED");
        _;
    }

    function bid(address to) external phaseBid preventReentrant isBidderAllow(to) {
        uint256 input = _getQuoteInput();
        uint256 mtFee = DecimalMath.mulFloor(input, _MT_FEE_RATE_MODEL_.getFeeRate(to));
        _transferQuoteOut(_MAINTAINER_, mtFee);
        _mintShares(to, input.sub(mtFee));
        _sync();
        emit Bid(to, input, mtFee);
    }

    function cancel(address assetTo, uint256 amount) external phaseBidOrCalm preventReentrant {
        require(_SHARES_[msg.sender] >= amount, "SHARES_NOT_ENOUGH");
        _burnShares(msg.sender, amount);
        _transferQuoteOut(assetTo, amount);
        _sync();
        emit Cancel(assetTo,amount);
    }

    function _mintShares(address to, uint256 amount) internal {
        _SHARES_[to] = _SHARES_[to].add(amount);
        _TOTAL_SHARES_ = _TOTAL_SHARES_.add(amount);
    }

    function _burnShares(address from, uint256 amount) internal {
        _SHARES_[from] = _SHARES_[from].sub(amount);
        _TOTAL_SHARES_ = _TOTAL_SHARES_.sub(amount);
    }

    // ============ SETTLEMENT ============

    function settle() external phaseSettlement preventReentrant {
        _settle();

        (uint256 poolBase, uint256 poolQuote) = getSettleResult();
        _UNUSED_QUOTE_ = _QUOTE_TOKEN_.balanceOf(address(this)).sub(poolQuote);
        _UNUSED_BASE_ = _BASE_TOKEN_.balanceOf(address(this)).sub(poolBase);

        // 这里的目的是让midPrice尽量等于avgPrice
        // 我们统一设定k=1，如果quote和base不平衡，就必然要截断一边
        // DVM截断了quote，所以如果进入池子的quote很多，就要把quote设置成DVM的base
        // m = avgPrice
        // i = m (1-quote/(m*base))
        // if quote = m*base i = 1
        // if quote > m*base reverse
        {
            address _poolBaseToken;
            address _poolQuoteToken;
            uint256 _poolI;

            uint256 avgPrice = _UNUSED_BASE_ == 0
            ? _I_
            : DecimalMath.divCeil(poolQuote, _UNUSED_BASE_);
            uint256 baseDepth = DecimalMath.mulFloor(avgPrice, poolBase);

            if (poolQuote == 0) {
                // ask side only DVM
                _poolBaseToken = address(_BASE_TOKEN_);
                _poolQuoteToken = address(_QUOTE_TOKEN_);
                _poolI = _I_;
            } else if (poolQuote.mul(_UNUSED_BASE_) == poolQuote.mul(poolBase)) {
                // standard bonding curve
                _poolBaseToken = address(_BASE_TOKEN_);
                _poolQuoteToken = address(_QUOTE_TOKEN_);
                _poolI = 1;
            } else if (poolQuote.mul(_UNUSED_BASE_) < poolQuote.mul(poolBase)) {
                // poolI up round
                _poolBaseToken = address(_BASE_TOKEN_);
                _poolQuoteToken = address(_QUOTE_TOKEN_);
                uint256 ratio = DecimalMath.ONE.sub(DecimalMath.divFloor(poolQuote, baseDepth));
                _poolI = avgPrice.mul(ratio).mul(ratio).divCeil(DecimalMath.ONE2);
            } else if (poolQuote.mul(_UNUSED_BASE_) > poolQuote.mul(poolBase)) {
                // poolI down round
                _poolBaseToken = address(_QUOTE_TOKEN_);
                _poolQuoteToken = address(_BASE_TOKEN_);
                uint256 ratio = DecimalMath.ONE.sub(DecimalMath.divCeil(baseDepth, poolQuote));
                _poolI = ratio.mul(ratio).div(avgPrice);
            }
            _POOL_ = IDVMFactory(_POOL_FACTORY_).createDODOVendingMachine(
                _poolBaseToken,
                _poolQuoteToken,
                3e15, // 0.3% lp feeRate
                _poolI,
                DecimalMath.ONE
            );
            _AVG_SETTLED_PRICE_ = avgPrice;
        }

        _transferBaseOut(_POOL_, poolBase);
        _transferQuoteOut(_POOL_, poolQuote);

        _TOTAL_LP_AMOUNT_ = IDVM(_POOL_).buyShares(address(this));

        msg.sender.transfer(_SETTEL_FUND_);
    }

    // in case something wrong with base token contract
    function emergencySettle() external phaseSettlement preventReentrant {
        require(block.timestamp >= _PHASE_CALM_ENDTIME_.add(_SETTLEMENT_EXPIRE_), "NOT_EMERGENCY");
        _settle();
        _UNUSED_QUOTE_ = _QUOTE_TOKEN_.balanceOf(address(this));
        _UNUSED_BASE_ = _BASE_TOKEN_.balanceOf(address(this));
    }

    function _settle() internal {
        require(!_SETTLED_, "ALREADY_SETTLED");
        _SETTLED_ = true;
        _SETTLED_TIME_ = block.timestamp;
    }

    // ============ Pricing ============

    function getSettleResult() public view returns (uint256 poolBase, uint256 poolQuote) {
        poolQuote = _QUOTE_TOKEN_.balanceOf(address(this));
        if (poolQuote > _POOL_QUOTE_CAP_) {
            poolQuote = _POOL_QUOTE_CAP_;
        }
        (uint256 soldBase,) = PMMPricing.sellQuoteToken(_getPMMState(), poolQuote);
        poolBase = _TOTAL_BASE_.sub(soldBase);
    }

    function _getPMMState() internal view returns (PMMPricing.PMMState memory state) {
        state.i = _I_;
        state.K = _K_;
        state.B = _TOTAL_BASE_;
        state.Q = 0;
        state.B0 = state.B;
        state.Q0 = 0;
        state.R = PMMPricing.RState.ONE;
    }

    function getExpectedAvgPrice() external view returns (uint256) {
        require(!_SETTLED_, "ALREADY_SETTLED");
        (uint256 poolBase, uint256 poolQuote) = getSettleResult();
        return DecimalMath.divCeil(poolQuote, _BASE_TOKEN_.balanceOf(address(this)).sub(poolBase));
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

    // ============ Asset Out ============

    function getShares(address user) external view returns (uint256) {
        return _SHARES_[user];
    }
}
