/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DPPStorage} from "./DPPStorage.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IDODOCallee} from "../../intf/IDODOCallee.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {Ownable} from "../../lib/Ownable.sol";
import {PMMPricing} from "../../lib/PMMPricing.sol";

contract DPPVault is DPPStorage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Events ============

    event LpFeeRateChange(uint256 newLpFeeRate);

    // ============ View Functions ============

    function getVaultReserve() external view returns (uint256 baseReserve, uint256 quoteReserve) {
        baseReserve = _BASE_RESERVE_;
        quoteReserve = _QUOTE_RESERVE_;
    }

    function getUserFeeRate(address user)
        external
        view
        returns (uint256 lpFeeRate, uint256 mtFeeRate)
    {
        lpFeeRate = _LP_FEE_RATE_;
        mtFeeRate = _MT_FEE_RATE_MODEL_.getFeeRate(user);
    }

    // ============ Get Input ============

    function getBaseInput() public view returns (uint256 input) {
        return _BASE_TOKEN_.balanceOf(address(this)).sub(_BASE_RESERVE_);
    }

    function getQuoteInput() public view returns (uint256 input) {
        return _QUOTE_TOKEN_.balanceOf(address(this)).sub(_QUOTE_RESERVE_);
    }

    // ============ Set Status ============

    function _setReserve(uint256 baseReserve, uint256 quoteReserve) internal {
        require(baseReserve <= uint120(-1) && quoteReserve <= uint120(-1), "OVERFLOW");
        _BASE_RESERVE_ = uint128(baseReserve);
        _QUOTE_RESERVE_ = uint128(quoteReserve);
    }

    function _sync() internal {
        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        
        require(baseBalance <= uint120(-1) && quoteBalance <= uint120(-1), "OVERFLOW");

        if (baseBalance != _BASE_RESERVE_) {
            _BASE_RESERVE_ = uint128(baseBalance);
        }
        if (quoteBalance != _QUOTE_RESERVE_) {
            _QUOTE_RESERVE_ = uint128(quoteBalance);
        }
    }

    function _resetTargetAndReserve() internal {
        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));

        require(baseBalance <= uint120(-1) && quoteBalance <= uint120(-1), "OVERFLOW");
        
        _BASE_RESERVE_ = uint128(baseBalance);
        _QUOTE_RESERVE_ = uint128(quoteBalance);
        _BASE_TARGET_ = uint120(baseBalance);
        _QUOTE_TARGET_ = uint120(quoteBalance);
        _setRState();
    }

    function _setRState() internal {
        if (_BASE_RESERVE_ == _BASE_TARGET_ && _QUOTE_RESERVE_ == _QUOTE_TARGET_) {
            _RState_ = uint16(PMMPricing.RState.ONE);
        } else if (_BASE_RESERVE_ > _BASE_TARGET_ && _QUOTE_RESERVE_ < _QUOTE_TARGET_) {
            _RState_ = uint16(PMMPricing.RState.BELOW_ONE);
        } else if (_BASE_RESERVE_ < _BASE_TARGET_ && _QUOTE_RESERVE_ > _QUOTE_TARGET_) {
            _RState_ = uint16(PMMPricing.RState.ABOVE_ONE);
        } else {
            require(false, "R_STATE_WRONG");
        }
    }


    function ratioSync() external preventReentrant onlyOwner {
        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));

        require(baseBalance <= uint120(-1) && quoteBalance <= uint120(-1), "OVERFLOW");

        if (baseBalance != _BASE_RESERVE_) {
            _BASE_TARGET_ = uint120(uint256(_BASE_TARGET_).mul(baseBalance).div(uint256(_BASE_RESERVE_)));
            _BASE_RESERVE_ = uint128(baseBalance);
        }
        if (quoteBalance != _QUOTE_RESERVE_) {
            _QUOTE_TARGET_ = uint120(uint256(_QUOTE_TARGET_).mul(quoteBalance).div(uint256(_QUOTE_RESERVE_)));
            _QUOTE_RESERVE_ = uint128(quoteBalance);
        }
    }

    function setTarget(uint256 baseTarget, uint256 quoteTarget) public preventReentrant onlyOwner {
        require(baseTarget <= uint120(-1) && quoteTarget <= uint120(-1), "OVERFLOW");
        _BASE_TARGET_ = uint120(baseTarget);
        _QUOTE_TARGET_ = uint120(quoteTarget);
        _setRState();
    }

    function reset(
        address assetTo,
        uint256 newLpFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint256 minBaseReserve,
        uint256 minQuoteReserve
    ) public preventReentrant onlyOwner returns (bool) {
        require(
            _BASE_RESERVE_ >= minBaseReserve && _QUOTE_RESERVE_ >= minQuoteReserve,
            "RESERVE_AMOUNT_IS_NOT_ENOUGH"
        );
        require(newLpFeeRate <= 1e18, "LP_FEE_RATE_OUT_OF_RANGE");
        require(newK <= 1e18, "K_OUT_OF_RANGE");
        require(newI > 0 && newI <= 1e36, "I_OUT_OF_RANGE");
        _LP_FEE_RATE_ = uint64(newLpFeeRate);
        _K_ = uint64(newK);
        _I_ = uint128(newI);
        _transferBaseOut(assetTo, baseOutAmount);
        _transferQuoteOut(assetTo, quoteOutAmount);
        _resetTargetAndReserve();
        emit LpFeeRateChange(newLpFeeRate);
        return true;
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

    function retrieve(
        address to,
        address token,
        uint256 amount
    ) external preventReentrant onlyOwner {
        require(token != address(_BASE_TOKEN_) && token != address(_QUOTE_TOKEN_), "USE_RESET");
        IERC20(token).safeTransfer(to, amount);
    }
}
