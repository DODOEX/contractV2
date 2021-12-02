/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Storage} from "./Storage.sol";
import {IDVM} from "../../DODOVendingMachine/intf/IDVM.sol";
import {IDVMFactory} from "../../Factory/DVMFactory.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

contract Vesting is Storage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;


    function _claimToken(address to, uint256 totalAllocation) internal {
        uint256 remainingToken = DecimalMath.mulFloor(
            getRemainingRatio(block.timestamp,0),
            totalAllocation
        );
        uint256 claimableTokenAmount = totalAllocation.sub(remainingToken).sub(_CLAIMED_TOKEN_[msg.sender]);
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to,claimableTokenAmount);
        _CLAIMED_TOKEN_[msg.sender] = _CLAIMED_TOKEN_[msg.sender].add(claimableTokenAmount);
    }

    function claimFunds(address to) external preventReentrant onlyOwner {
        uint256 vestingFunds = _TOTAL_RAISED_FUNDS_.sub(_INITIAL_FUND_LIQUIDITY_);
        uint256 remainingFund = DecimalMath.mulFloor(
            getRemainingRatio(block.timestamp,1),
            vestingFunds
        );
        uint256 claimableFund = vestingFunds.sub(remainingFund).sub(_CLAIMED_FUNDS_);
        IERC20(_FUNDS_ADDRESS_).safeTransfer(to, claimableFund);
        _CLAIMED_FUNDS_ = _CLAIMED_FUNDS_.add(claimableFund);
    }

    function claimLp(address to) external preventReentrant onlyOwner {
        require(_INITIAL_POOL_ != address(0), "LIQUIDITY_NOT_ESTABLISHED");
        uint256 remainingLp = DecimalMath.mulFloor(
            getRemainingRatio(block.timestamp,2),
            _TOTAL_LP_
        );
        uint256 claimableLp = _TOTAL_LP_.sub(remainingLp).sub(_CLAIMED_LP_);

        IERC20(_INITIAL_POOL_).safeTransfer(to, claimableLp);
        _CLAIMED_LP_ = _CLAIMED_LP_.add(claimableLp);
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

        uint256 timePast = timestamp.sub(vestingStart);
        if (timePast < vestingDuration) {
            uint256 remainingTime = vestingDuration.sub(timePast);
            return DecimalMath.ONE.sub(cliffRate).mul(remainingTime).div(vestingDuration);
        } else {
            return 0;
        }
    }

    function initializeLiquidity(uint256 initialTokenAmount, uint256 lpFeeRate, bool isOpenTWAP) external preventReentrant onlyOwner {
        _INITIAL_POOL_ = IDVMFactory(_POOL_FACTORY_).createDODOVendingMachine(
            _TOKEN_ADDRESS_,
            _FUNDS_ADDRESS_,
            lpFeeRate,
            1,
            DecimalMath.ONE,
            isOpenTWAP
        );
        IERC20(_TOKEN_ADDRESS_).transferFrom(msg.sender, _INITIAL_POOL_, initialTokenAmount);
        IERC20(_FUNDS_ADDRESS_).transfer(_INITIAL_POOL_, _INITIAL_FUND_LIQUIDITY_);
        (_TOTAL_LP_, , ) = IDVM(_INITIAL_POOL_).buyShares(address(this));
    }
}
