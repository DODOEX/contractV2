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

    // ============ Get Input ============

    function getInput() public view returns (uint256 baseInput, uint256 quoteInput) {
        return (
            _BASE_TOKEN_.balanceOf(address(this)).sub(_BASE_RESERVE_),
            _QUOTE_TOKEN_.balanceOf(address(this)).sub(_QUOTE_RESERVE_)
        );
    }

    function getBaseInput() public view returns (uint256 input) {
        return _BASE_TOKEN_.balanceOf(address(this)).sub(_BASE_RESERVE_);
    }

    function getQuoteInput() public view returns (uint256 input) {
        return _QUOTE_TOKEN_.balanceOf(address(this)).sub(_QUOTE_RESERVE_);
    }

    // ============ Vault Related
    function getVaultReserve() public view returns (uint256 baseReserve, uint256 quoteReserve) {
        return (_BASE_RESERVE_, _QUOTE_RESERVE_);
    }

    // ============ Set Status ============

    function setTarget(uint256 baseTarget, uint256 quoteTarget) public preventReentrant onlyOwner {
        _BASE_TARGET_ = baseTarget;
        _QUOTE_TARGET_ = quoteTarget;
        _setRState();
    }

    function _resetTargetAndReserve() internal {
        _BASE_TARGET_ = _BASE_TOKEN_.balanceOf(address(this));
        _QUOTE_TARGET_ = _QUOTE_TOKEN_.balanceOf(address(this));
        _BASE_RESERVE_ = _BASE_TARGET_;
        _QUOTE_RESERVE_ = _QUOTE_TARGET_;
        _setRState();
    }

    function reset(
        address assetTo,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount
    ) public preventReentrant onlyOwner {
        require(newK >= 1e12 && newK <= 1e18, "K_OUT_OF_RANGE");
        require(newI > 0 && newI <= 1e36, "I_OUT_OF_RANGE");
        _LP_FEE_RATE_MODEL_.setFeeRate(newLpFeeRate);
        _MT_FEE_RATE_MODEL_.setFeeRate(newMtFeeRate);
        _I_.set(newI);
        _K_.set(newK);
        _transferBaseOut(assetTo, baseOutAmount);
        _transferQuoteOut(assetTo, quoteOutAmount);
        _resetTargetAndReserve();
    }

    function _setRState() internal {
        if (_BASE_RESERVE_ == _BASE_TARGET_ && _QUOTE_RESERVE_ == _QUOTE_TARGET_) {
            _RState_ = PMMPricing.RState.ONE;
        } else if (_BASE_RESERVE_ > _BASE_TARGET_) {
            _RState_ = PMMPricing.RState.BELOW_ONE;
        } else if (_QUOTE_RESERVE_ > _QUOTE_TARGET_) {
            _RState_ = PMMPricing.RState.ABOVE_ONE;
        } else {
            require(false, "R_STATE_WRONG");
        }
    }

    // ============ Assets Transfer ============

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
