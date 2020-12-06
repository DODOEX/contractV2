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
import {CAFunding} from "./CAFunding.sol";

/**
 * @title LockedTokenVault
 * @author DODO Breeder
 *
 * @notice Lock Token and release it linearly
 */

contract LockedTokenVault is CAFunding {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Functions ============

    function claim() external {
        uint256 claimableToken = getClaimableBalance(msg.sender);
        _transferBaseOut(msg.sender, claimableToken);
        _CLAIMED_BALANCES_[msg.sender] = _CLAIMED_BALANCES_[msg.sender].add(claimableToken);
    }

    // ============ View ============

    function getOriginBaseBalance(address user) public view returns (uint256) {
        return _TOTAL_SOLD_BASE_.mul(_QUOTE_SHARES_[user]).div(_TOTAL_QUOTE_SHARES_);
    }

    function getClaimedBaseBalance(address holder) public view returns (uint256) {
        return _CLAIMED_BALANCES_[holder];
    }

    function getClaimableBalance(address holder) public view returns (uint256) {
        uint256 remainingToken = getRemainingBalance(holder);
        return getOriginBaseBalance(holder).sub(remainingToken).sub(_CLAIMED_BALANCES_[holder]);
    }

    function getRemainingBalance(address holder) public view returns (uint256) {
        uint256 remainingRatio = getRemainingRatio(block.timestamp);
        return DecimalMath.mulFloor(getOriginBaseBalance(holder), remainingRatio);
    }

    function getRemainingRatio(uint256 timestamp) public view returns (uint256) {
        if (timestamp < _START_VESTING_TIME_) {
            return DecimalMath.ONE;
        }
        uint256 timePast = timestamp.sub(_START_VESTING_TIME_);
        if (timePast < _VESTING_DURATION_) {
            uint256 remainingTime = _VESTING_DURATION_.sub(timePast);
            return DecimalMath.ONE.sub(_CLIFF_RATE_).mul(remainingTime).div(_VESTING_DURATION_);
        } else {
            return 0;
        }
    }
}
