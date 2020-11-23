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

    // ============ Set Status ============

    function setTarget(uint256 baseTarget, uint256 quoteTarget) public onlyOwner {
        _BASE_TARGET_ = baseTarget;
        _QUOTE_TARGET_ = quoteTarget;
        _checkStatus();
    }
    
    function _syncReserve() internal {
        _BASE_RESERVE_ = _BASE_TOKEN_.balanceOf(address(this));
        _QUOTE_RESERVE_ = _QUOTE_TOKEN_.balanceOf(address(this));
    }

    function _resetTargetAndReserve() internal {
        _BASE_TARGET_ = _BASE_TOKEN_.balanceOf(address(this));
        _QUOTE_TARGET_ = _QUOTE_TOKEN_.balanceOf(address(this));
        _BASE_RESERVE_ = _BASE_TARGET_;
        _QUOTE_RESERVE_ = _QUOTE_TARGET_;
    }

    function reset(
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        address to
    ) public {
        //TODO: owner 权限可以是operator
        require(msg.sender == _DODO_SMART_APPROVE_.getSmartSwap() || msg.sender == _OWNER_, "RESET FORBIDDEN！");
        require(newK > 0 && newK <= 10**18, "K OUT OF RANGE!");
        if(baseOutAmount > 0)  _transferBaseOut(to, baseOutAmount);
        if(quoteOutAmount > 0) _transferQuoteOut(to, quoteOutAmount);
        _resetTargetAndReserve();
        _LP_FEE_RATE_MODEL_.setFeeRate(newLpFeeRate);
        _MT_FEE_RATE_MODEL_.setFeeRate(newMtFeeRate);
        _I_.set(newI);
        _K_.set(newK);
    }

    function _checkStatus() internal view {
        require(
            !(_BASE_RESERVE_ < _BASE_TARGET_ && _QUOTE_RESERVE_ < _QUOTE_TARGET_),
            "STATUS_WRONG"
        );
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
        address payable to,
        address token,
        uint256 amount
    ) external onlyOwner {
        require(to != address(_BASE_TOKEN_) && to != address(_QUOTE_TOKEN_), "USE_WITHDRAW");
        if (token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            to.transfer(amount);
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }
}
