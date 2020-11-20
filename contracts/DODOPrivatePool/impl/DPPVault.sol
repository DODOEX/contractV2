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

    // input

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

    function _syncReserve() internal {
        _BASE_RESERVE_ = _BASE_TOKEN_.balanceOf(address(this));
        _QUOTE_RESERVE_ = _QUOTE_TOKEN_.balanceOf(address(this));
    }

    function setTarget(uint256 baseTarget, uint256 quoteTarget) public onlyOwner {
        _BASE_TARGET_ = baseTarget;
        _QUOTE_TARGET_ = quoteTarget;
        _checkStatus();
    }

    //TODO: Route queryfunc 以及 withdraw and reset
    // todo 这里需要考虑，怎么一个tx同时更新k i 和 fee并reset
    //TODO: 修改feerate等
    function reset() public onlyOwner {
        _BASE_TARGET_ = _BASE_TOKEN_.balanceOf(address(this));
        _QUOTE_TARGET_ = _QUOTE_TOKEN_.balanceOf(address(this));
        _BASE_RESERVE_ = _BASE_TARGET_;
        _QUOTE_RESERVE_ = _QUOTE_TARGET_;
    }

    function _checkStatus() internal view {
        require(
            !(_BASE_RESERVE_ < _BASE_TARGET_ && _QUOTE_RESERVE_ < _QUOTE_TARGET_),
            "STATUS_WRONG"
        );
    }

    // ============ Assets Transfer ============

    //TODO：确定Amount后，内部调用
    function withdraw(
        address to,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata data
    ) public onlyOwner {
        _transferBaseOut(to, baseAmount);
        _transferQuoteOut(to, quoteAmount);
        _BASE_TARGET_ = _BASE_TARGET_.sub(baseAmount);
        _QUOTE_TARGET_ = _QUOTE_TARGET_.sub(quoteAmount);
        if (data.length > 0) {
            IDODOCallee(to).DPPWithdrawCall(msg.sender, baseAmount, quoteAmount, data);
        }
    }

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

    // todo 高级功能，需要讨论
    // 如果单独执行这个功能会导致状态失衡
    function retrieve(
        address payable to,
        address token,
        uint256 amount
    ) external onlyOwner {
        require(to != address(_BASE_TOKEN_) && to != address(_QUOTE_TOKEN_), "USE_WITHDRAW");
        if (token == 0x000000000000000000000000000000000000000E) {
            to.transfer(amount);
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }
}
