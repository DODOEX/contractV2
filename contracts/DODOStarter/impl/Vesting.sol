/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InstantFunding} from "./InstantFunding.sol";
import {IDVM} from "../../DODOVendingMachine/intf/IDVM.sol";
import {IDVMFactory} from "../../Factory/DVMFactory.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

contract Vesting is InstantFunding {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Timeline ============

    uint256 public _TOKEN_VESTING_START_;
    uint256 public _TOKEN_VESTING_DURATION_;
    mapping(address => uint256) _CLAIMED_TOKEN_;

    uint256 public _FUNDS_VESTING_START_;
    uint256 public _FUNDS_VESTING_DURATION_;
    uint256 _CLAIMED_FUNDS_;

    uint256 public _LP_VESTING_START_;
    uint256 public _LP_VESTING_DURATION_;
    uint256 _CLAIMED_LP_;

    // ============ Liquidity Params ============

    address public _POOL_FACTORY_;
    address public _INITIAL_POOL_;
    uint256 public _INITIAL_FUND_LIQUIDITY_;
    uint256 public _TOTAL_LP_;

    function claimToken(address to) external {
        uint256 totalAllocation = getUserTokenAllocation(msg.sender);
        uint256 unlockedAllocation = totalAllocation
            .mul(block.timestamp.sub(_TOKEN_VESTING_START_))
            .div(_TOKEN_VESTING_DURATION_);
        IERC20(_TOKEN_ADDRESS_).safeTransfer(
            to,
            unlockedAllocation.sub(_CLAIMED_TOKEN_[msg.sender])
        );
        _CLAIMED_TOKEN_[msg.sender] = unlockedAllocation;
    }

    function claimFunds(address to) external preventReentrant onlyOwner {
        uint256 vestingFunds = _TOTAL_RAISED_FUNDS_.sub(_INITIAL_FUND_LIQUIDITY_);
        uint256 unlockedFunds = vestingFunds.mul(block.timestamp.sub(_FUNDS_VESTING_START_)).div(
            _FUNDS_VESTING_DURATION_
        );
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to, unlockedFunds.sub(_CLAIMED_FUNDS_));
        _CLAIMED_FUNDS_ = unlockedFunds;
    }

    function claimLp(address to) external preventReentrant onlyOwner {
        require(_INITIAL_POOL_ != address(0), "LIQUIDITY_NOT_ESTABLISHED");
        uint256 unlockedLp = _TOTAL_LP_.mul(block.timestamp.sub(_LP_VESTING_START_)).div(
            _LP_VESTING_DURATION_
        );
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to, unlockedLp.sub(_CLAIMED_LP_));
        _CLAIMED_LP_ = unlockedLp;
    }

    function initializeLiquidity(uint256 initialTokenAmount) external preventReentrant onlyOwner {
        _INITIAL_POOL_ = IDVMFactory(_POOL_FACTORY_).createDODOVendingMachine(
            _TOKEN_ADDRESS_,
            _FUNDS_ADDRESS_,
            3e15, // 0.3% lp feeRate DIP3
            1,
            DecimalMath.ONE,
            true //TODO:是否开启
        );
        IERC20(_TOKEN_ADDRESS_).transferFrom(msg.sender, _INITIAL_POOL_, initialTokenAmount);
        IERC20(_FUNDS_ADDRESS_).transfer(_INITIAL_POOL_, _INITIAL_FUND_LIQUIDITY_);
        (_TOTAL_LP_, , ) = IDVM(_INITIAL_POOL_).buyShares(address(this));
    }
}
