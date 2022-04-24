/*

    Copyright 2022 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Storage} from "./Storage.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IDVM} from "../../DODOVendingMachine/intf/IDVM.sol";
import {IDVMFactory} from "../../Factory/DVMFactory.sol";

contract Vesting is Storage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Events ============
    event ClaimLpToken(address indexed to, uint256 lpAmount);
    
    function claimLp(address to) external preventReentrant onlyOwner {
        require(_INITIAL_POOL_ != address(0), "LIQUIDITY_NOT_ESTABLISHED");
        uint256 remainingLp = DecimalMath.mulFloor(
            getRemainingRatio(block.timestamp,2),
            _TOTAL_LP_
        );
        uint256 claimableLp = _TOTAL_LP_.sub(remainingLp).sub(_CLAIMED_LP_);

        _CLAIMED_LP_ = _CLAIMED_LP_.add(claimableLp);
        IERC20(_INITIAL_POOL_).safeTransfer(to, claimableLp);

        emit ClaimLpToken(to, claimableLp);
    }

    //tokenType 0: BaseToken, 1: Fund, 2: LpToken
    function getRemainingRatio(uint256 timestamp, uint256 tokenType) public view returns (uint256) {
        uint256 vestingStart;
        uint256 vestingDuration;
        uint256 cliffRate;

        if(tokenType == 0) {
            vestingStart = _TOKEN_VESTING_START_;
            vestingDuration = _TOKEN_VESTING_DURATION_;
            cliffRate = _TOKEN_CLIFF_RATE_;
        } else if(tokenType == 1) {
            vestingStart = _FUNDS_VESTING_START_;
            vestingDuration = _FUNDS_VESTING_DURATION_;
            cliffRate = _FUNDS_CLIFF_RATE_;
        } else {
            vestingStart = _LP_VESTING_START_;
            vestingDuration = _LP_VESTING_DURATION_;
            cliffRate = _LP_CLIFF_RATE_;
        }

        require(timestamp >= vestingStart, "NOT_START_TO_CLAIM");

        uint256 timePast = timestamp.sub(vestingStart);
        if (timePast < vestingDuration) {
            uint256 remainingTime = vestingDuration.sub(timePast);
            return DecimalMath.ONE.sub(cliffRate).mul(remainingTime).div(vestingDuration);
        } else {
            return 0;
        }
    }


    // ============ Internal Function ============
    function _claimToken(address to, uint256 totalAllocation) internal returns(uint256 claimableTokenAmount) {
        uint256 remainingToken = DecimalMath.mulFloor(
            getRemainingRatio(block.timestamp,0),
            totalAllocation
        );
        claimableTokenAmount = totalAllocation.sub(remainingToken).sub(_CLAIMED_TOKEN_[msg.sender]);
        _CLAIMED_TOKEN_[msg.sender] = _CLAIMED_TOKEN_[msg.sender].add(claimableTokenAmount);
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to,claimableTokenAmount);
    }

    function _claimFunds(address to, uint256 totalUsedRaiseFunds) internal returns(uint256 claimableFund) {
        require(totalUsedRaiseFunds > _INITIAL_FUND_LIQUIDITY_, "FUND_NOT_ENOUGH");
        uint256 vestingFunds = totalUsedRaiseFunds.sub(_INITIAL_FUND_LIQUIDITY_);
        uint256 remainingFund = DecimalMath.mulFloor(
            getRemainingRatio(block.timestamp,1),
            vestingFunds
        );
        claimableFund = vestingFunds.sub(remainingFund).sub(_CLAIMED_FUNDS_);
        _CLAIMED_FUNDS_ = _CLAIMED_FUNDS_.add(claimableFund);
        IERC20(_FUNDS_ADDRESS_).safeTransfer(to, claimableFund);
    }

    function _initializeLiquidity(uint256 initialTokenAmount, uint256 totalUsedRaiseFunds, uint256 lpFeeRate, bool isOpenTWAP) internal {
        _INITIAL_POOL_ = IDVMFactory(_POOL_FACTORY_).createDODOVendingMachine(
            _TOKEN_ADDRESS_,
            _FUNDS_ADDRESS_,
            lpFeeRate,
            1,
            DecimalMath.ONE,
            isOpenTWAP
        );
        IERC20(_TOKEN_ADDRESS_).safeTransferFrom(msg.sender, _INITIAL_POOL_, initialTokenAmount);
        
        if(totalUsedRaiseFunds > _INITIAL_FUND_LIQUIDITY_) {
            IERC20(_FUNDS_ADDRESS_).safeTransfer(_INITIAL_POOL_, _INITIAL_FUND_LIQUIDITY_);
        }else {
            IERC20(_FUNDS_ADDRESS_).safeTransfer(_INITIAL_POOL_, totalUsedRaiseFunds);
        }
        
        (_TOTAL_LP_, , ) = IDVM(_INITIAL_POOL_).buyShares(address(this));
    }
}
