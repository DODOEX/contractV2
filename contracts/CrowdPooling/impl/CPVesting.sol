/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {Ownable} from "../../lib/Ownable.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {CPFunding} from "./CPFunding.sol";

/**
 * @title CPVesting
 * @author DODO Breeder
 *
 * @notice Lock Token and release it linearly
 */

contract CPVesting is CPFunding {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    modifier afterSettlement() {
        require(_SETTLED_, "NOT_SETTLED");
        _;
    }

    modifier afterFreeze() {
        require(block.timestamp >= _SETTLED_TIME_.add(_FREEZE_DURATION_), "FREEZED");
        _;
    }

    // ============ Functions ============

    function claimBase() external afterSettlement {
        require(!_BASE_CLAIMED_[msg.sender], "BASE_CLAIMED");
        _BASE_CLAIMED_[msg.sender] = true;
        _transferBaseOut(msg.sender, _UNUSED_BASE_.mul(_SHARES_[msg.sender]).div(_TOTAL_SHARES_));
    }

    function claimQuote() external afterSettlement {
        require(!_QUOTE_CLAIMED_[msg.sender], "QUOTE_CLAIMED");
        _QUOTE_CLAIMED_[msg.sender] = true;
        _transferQuoteOut(msg.sender, _UNUSED_QUOTE_.mul(_SHARES_[msg.sender]).div(_TOTAL_SHARES_));
    }

    function claimLPToken() external onlyOwner afterFreeze {
        IERC20(_POOL_).safeTransfer(_OWNER_, IERC20(_POOL_).balanceOf(address(this)));
    }
}
