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
import {IDODOCallee} from "../../intf/IDODOCallee.sol";

/**
 * @title CPVesting
 * @author DODO Breeder
 *
 * @notice Lock Token and release it linearly
 */

contract CPVesting is CPFunding {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Events ============
    
    event ClaimBaseToken(address user, uint256 baseAmount);
    event ClaimQuoteToken(address user, uint256 quoteAmount);
    event ClaimLP(uint256 amount);


    // ================ Modifiers ================

    modifier afterSettlement() {
        require(_SETTLED_, "NOT_SETTLED");
        _;
    }

    modifier afterFreeze() {
        require(_SETTLED_ && block.timestamp >= _SETTLED_TIME_.add(_FREEZE_DURATION_), "FREEZED");
        _;
    }

    modifier afterClaimFreeze() {
        require(_SETTLED_ && block.timestamp >= _SETTLED_TIME_.add(_TOKEN_CLAIM_DURATION_), "CLAIM_FREEZED");
        _;
    }

    // ============ Bidder Functions ============

    function bidderClaim(address to, bytes calldata data) external {
        if(_SETTLED_) {
            _claimQuoteToken(to, data);
        }

        if(_SETTLED_ && block.timestamp >= _SETTLED_TIME_.add(_TOKEN_CLAIM_DURATION_)) {
            _claimBaseToken(to);
        }
    }

    function _claimQuoteToken(address to,bytes calldata data) internal {
        // require(!_CLAIMED_QUOTE_[msg.sender], "ALREADY_CLAIMED_FUND");
        if(_CLAIMED_QUOTE_[msg.sender]) return;

        _CLAIMED_QUOTE_[msg.sender] = true;

		uint256 quoteAmount = _UNUSED_QUOTE_.mul(_SHARES_[msg.sender]).div(_TOTAL_SHARES_);

        _transferQuoteOut(to, quoteAmount);

		if(data.length>0){
			IDODOCallee(to).CPClaimBidCall(msg.sender,0,quoteAmount,data);
		}

        emit ClaimQuoteToken(msg.sender, quoteAmount);
    }

    function _claimBaseToken(address to) internal {
        uint256 claimableBaseAmount = getClaimableBaseToken(msg.sender);
        _CLAIMED_BASE_TOKEN_[msg.sender] = _CLAIMED_BASE_TOKEN_[msg.sender].add(claimableBaseAmount);
        _transferBaseOut(to, claimableBaseAmount);
        emit ClaimBaseToken(msg.sender, claimableBaseAmount);
    }

    function getClaimableBaseToken(address user) public view afterClaimFreeze returns (uint256) {
        uint256 baseTotalAmount = _UNUSED_BASE_.mul(_SHARES_[user]).div(_TOTAL_SHARES_);

        uint256 remainingBaseToken = DecimalMath.mulFloor(
            getRemainingBaseTokenRatio(block.timestamp),
            baseTotalAmount
        );
        return baseTotalAmount.sub(remainingBaseToken).sub(_CLAIMED_BASE_TOKEN_[user]);
    }

    function getRemainingBaseTokenRatio(uint256 timestamp) public view afterClaimFreeze returns (uint256) {
        uint256 timePast = timestamp.sub(_SETTLED_TIME_.add(_TOKEN_CLAIM_DURATION_));
        if (timePast < _TOKEN_VESTING_DURATION_) {
            uint256 remainingTime = _TOKEN_VESTING_DURATION_.sub(timePast);
            return DecimalMath.ONE.sub(_TOKEN_CLIFF_RATE_).mul(remainingTime).div(_TOKEN_VESTING_DURATION_);
        } else {
            return 0;
        }
    }

    // ============ Owner Functions ============

    function claimLPToken() external onlyOwner afterFreeze {
        uint256 lpAmount = getClaimableLPToken();
        IERC20(_POOL_).safeTransfer(_OWNER_, lpAmount);
        emit ClaimLP(lpAmount);
    }

    function getClaimableLPToken() public view afterFreeze returns (uint256) {
        uint256 remainingLPToken = DecimalMath.mulFloor(
            getRemainingLPRatio(block.timestamp),
            _TOTAL_LP_AMOUNT_
        );
        return IERC20(_POOL_).balanceOf(address(this)).sub(remainingLPToken);
    }

    function getRemainingLPRatio(uint256 timestamp) public view afterFreeze returns (uint256) {
        uint256 timePast = timestamp.sub(_SETTLED_TIME_.add(_FREEZE_DURATION_));
        if (timePast < _VESTING_DURATION_) {
            uint256 remainingTime = _VESTING_DURATION_.sub(timePast);
            return DecimalMath.ONE.sub(_CLIFF_RATE_).mul(remainingTime).div(_VESTING_DURATION_);
        } else {
            return 0;
        }
    }
}
