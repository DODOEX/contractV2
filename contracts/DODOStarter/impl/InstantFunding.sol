/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {IQuota} from "../../DODOFee/UserQuota.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

contract InstantFunding is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Token & Balance ============

    uint256 public _FUNDS_RESERVE_;
    address public _FUNDS_ADDRESS_;
    address public _TOKEN_ADDRESS_;
    uint256 public _TOTAL_TOKEN_AMOUNT_;

    // ============ Instant Commit Mode ============

    uint256 public _START_TIME_;
    uint256 public _DURATION_;
    uint256 public _START_PRICE_;
    uint256 public _END_PRICE_;

    address _QUOTA_;
    mapping(address => uint256) _FUNDS_USED_;
    mapping(address => uint256) _FUNDS_UNUSED_;
    mapping(address => uint256) _TOKEN_ALLOCATION_;
    uint256 public _TOTAL_ALLOCATED_TOKEN_;
    uint256 public _TOTAL_RAISED_FUNDS_;

    // ============ View Functions ============
    function getCurrentPrice() public view returns (uint256 price) {
        if (block.timestamp <= _START_TIME_) {
            price = _START_PRICE_;
        } else if (block.timestamp >= _START_TIME_.add(_DURATION_)) {
            price = _END_PRICE_;
        } else {
            uint256 timePast = block.timestamp.sub(_START_TIME_);
            price = _START_PRICE_.mul(_DURATION_.sub(timePast)).div(_DURATION_).add(
                _END_PRICE_.mul(timePast).div(_DURATION_)
            );
        }
    }

    function getUserTokenAllocation(address user) public view returns (uint256) {
        return _TOKEN_ALLOCATION_[user];
    }

    function getUserFundsUnused(address user) public view returns (uint256) {
        return _FUNDS_UNUSED_[user];
    }

    function getUserFundsUsed(address user) public view returns (uint256) {
        return _FUNDS_USED_[user];
    }

    // ============ Funding Functions ============
    //TODO:强制转入，适配通缩代币
    function depositToken(uint256 amount) external preventReentrant onlyOwner {
        require(block.timestamp < _START_TIME_, "FUNDING_ALREADY_STARTED");
        IERC20(_TOKEN_ADDRESS_).safeTransferFrom(msg.sender, address(this), amount);
        _TOTAL_TOKEN_AMOUNT_ = _TOTAL_TOKEN_AMOUNT_.add(amount);
    }

    function depositFunds(address to)
        external
        preventReentrant
        returns (uint256 newTokenAllocation)
    {
        require(isDepositOpen(), "DEPOSIT_NOT_OPEN");
        // input fund check
        uint256 inputFund = IERC20(_FUNDS_ADDRESS_).balanceOf(address(this)).sub(_FUNDS_RESERVE_);
        _FUNDS_RESERVE_ = _FUNDS_RESERVE_.add(inputFund);

        if (_QUOTA_ != address(0)) {
            require(
                inputFund.add(_FUNDS_USED_[to]) <= uint256(IQuota(_QUOTA_).getUserQuota(to)),
                "QUOTA_EXCEED"
            );
        }

        // allocation calculation
        uint256 currentPrice = getCurrentPrice();
        newTokenAllocation = DecimalMath.divFloor(inputFund, currentPrice);

        if (newTokenAllocation.add(_TOTAL_ALLOCATED_TOKEN_) > _TOTAL_TOKEN_AMOUNT_) {
            newTokenAllocation = _TOTAL_TOKEN_AMOUNT_.sub(_TOTAL_ALLOCATED_TOKEN_);
            uint256 fundUsed = DecimalMath.mulFloor(newTokenAllocation, currentPrice);
            _FUNDS_USED_[to] = _FUNDS_USED_[to].add(fundUsed);
            _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.add(fundUsed);
            _FUNDS_UNUSED_[to] = _FUNDS_UNUSED_[to].add(inputFund.sub(fundUsed));
        } else {
            _FUNDS_USED_[to] = _FUNDS_USED_[to].add(inputFund);
            _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.add(inputFund);
        }

        _TOKEN_ALLOCATION_[to] = _TOKEN_ALLOCATION_[to].add(newTokenAllocation);
        _TOTAL_ALLOCATED_TOKEN_ = _TOTAL_ALLOCATED_TOKEN_.add(newTokenAllocation);
    }

    function withdrawFunds(address to, uint256 amount) external preventReentrant {
        require(_FUNDS_UNUSED_[msg.sender] >= amount, "UNUSED_FUND_NOT_ENOUGH");
        _FUNDS_UNUSED_[msg.sender] = _FUNDS_UNUSED_[msg.sender].sub(amount);
        IERC20(_FUNDS_ADDRESS_).safeTransfer(to, amount);
        _FUNDS_RESERVE_ = _FUNDS_RESERVE_.sub(amount);
    }

    function withdrawUnallocatedToken(address to) external preventReentrant onlyOwner {
        require(isFundingEnd(), "CAN_NOT_WITHDRAW");
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to, _TOTAL_TOKEN_AMOUNT_.sub(_TOTAL_ALLOCATED_TOKEN_));
        _TOTAL_TOKEN_AMOUNT_ = _TOTAL_ALLOCATED_TOKEN_;
    }

    // ============ Timeline Control Functions ============

    function isDepositOpen() public view returns (bool) {
        return
            block.timestamp >= _START_TIME_ &&
            block.timestamp < _START_TIME_.add(_DURATION_);
    }

    function isFundingEnd() public view returns (bool) {
        return block.timestamp > _START_TIME_.add(_DURATION_);
    }
}
