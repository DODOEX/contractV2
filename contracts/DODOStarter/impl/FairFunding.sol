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

contract FairFunding is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Token & Balance ============

    uint256 public _FUNDS_RESERVE_;
    address public _FUNDS_ADDRESS_;
    address public _TOKEN_ADDRESS_;
    uint256 public _TOTAL_TOKEN_AMOUNT_;

    // ============ Fair Mode ============

    uint256 public _START_TIME_;
    uint256 public _BIDDING_DURATION_;
    uint256 public _COOLING_DURATION_;

    address _QUOTA_;
    mapping(address => uint256) _FUNDS_DEPOSITED_;
    mapping(address => bool) _FUNDS_CLAIMED_;
    uint256 public _TOTAL_RAISED_FUNDS_;
    uint256 public _USED_FUND_RATIO_;
    uint256 public _FINAL_PRICE_;

    // ============ Parameters ============

    uint256 public _LOWER_LIMIT_PRICE_;
    uint256 public _UPPER_LIMIT_PRICE_;

    // ============ View Functions ============

    function getCurrentPrice() public view returns (uint256) {
        return getPrice(_TOTAL_RAISED_FUNDS_);
    }

    function getPrice(uint256 fundAmount) public view returns (uint256 price) {
        price = DecimalMath.divFloor(fundAmount, _TOTAL_TOKEN_AMOUNT_);
        if (price < _LOWER_LIMIT_PRICE_) {
            price = _LOWER_LIMIT_PRICE_;
        }
        if (price > _UPPER_LIMIT_PRICE_) {
            price = _UPPER_LIMIT_PRICE_;
        }
    }

    function getUserTokenAllocation(address user) public view returns (uint256) {
        if (_FINAL_PRICE_ == 0) {
            return 0;
        } else {
            return
                DecimalMath.divFloor(
                    DecimalMath.mulFloor(_FUNDS_DEPOSITED_[user], _USED_FUND_RATIO_),
                    _FINAL_PRICE_
                );
        }
    }

    function getUserFundsUnused(address user) public view returns (uint256) {
        return
            DecimalMath.mulFloor(_FUNDS_DEPOSITED_[user], DecimalMath.ONE.sub(_USED_FUND_RATIO_));
    }

    function getUserFundsUsed(address user) public view returns (uint256) {
        return DecimalMath.mulFloor(_FUNDS_DEPOSITED_[user], _USED_FUND_RATIO_);
    }

    // ============ Settle Functions ============

    function settle() public {
        require(_FINAL_PRICE_ == 0 && isFundingEnd(), "CAN_NOT_SETTLE");
        _FINAL_PRICE_ = getCurrentPrice();
        _USED_FUND_RATIO_ = DecimalMath.divFloor(
            DecimalMath.mulFloor(_TOTAL_TOKEN_AMOUNT_, _FINAL_PRICE_),
            _TOTAL_RAISED_FUNDS_
        );
        if (_USED_FUND_RATIO_ > DecimalMath.ONE) {
            _USED_FUND_RATIO_ = DecimalMath.ONE;
        }
    }

    // ============ Funding Functions ============

    function depositToken(uint256 amount) external preventReentrant onlyOwner {
        require(block.timestamp < _START_TIME_, "FUNDING_ALREADY_STARTED");
        IERC20(_TOKEN_ADDRESS_).safeTransferFrom(msg.sender, address(this), amount);
        _TOTAL_TOKEN_AMOUNT_ = _TOTAL_TOKEN_AMOUNT_.add(amount);
    }

    function depositFunds(address to) external preventReentrant {
        require(isDepositOpen(), "DEPOSIT_NOT_OPEN");
        // input fund check
        uint256 inputFund = IERC20(_FUNDS_ADDRESS_).balanceOf(address(this)).sub(_FUNDS_RESERVE_);
        _FUNDS_RESERVE_ = _FUNDS_RESERVE_.add(inputFund);

        if (_QUOTA_ != address(0)) {
            require(
                inputFund.add(_FUNDS_DEPOSITED_[to]) <= uint256(IQuota(_QUOTA_).getUserQuota(to)),
                "QUOTA_EXCEED"
            );
        }

        _FUNDS_DEPOSITED_[to] = _FUNDS_DEPOSITED_[to].add(inputFund);
        _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.add(inputFund);
    }

    function withdrawFunds(address to, uint256 amount) external preventReentrant {
        if (!isSettled()) {
            require(_FUNDS_DEPOSITED_[msg.sender] >= amount, "WITHDRAW_TOO_MUCH");
            _FUNDS_DEPOSITED_[msg.sender] = _FUNDS_DEPOSITED_[msg.sender].sub(amount);
            _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.sub(amount);
            IERC20(_FUNDS_ADDRESS_).safeTransfer(to, amount);
        } else {
            require(!_FUNDS_CLAIMED_[msg.sender], "ALREADY_CLAIMED");
            _FUNDS_CLAIMED_[msg.sender] = true;
            IERC20(_FUNDS_ADDRESS_).safeTransfer(to, getUserFundsUnused(msg.sender));
        }
    }

    function withdrawUnallocatedToken(address to) external preventReentrant onlyOwner {
        require(_FINAL_PRICE_ == _LOWER_LIMIT_PRICE_, "NO_TOKEN_LEFT");
        uint256 allocatedToken = DecimalMath.divCeil(_TOTAL_RAISED_FUNDS_, _FINAL_PRICE_);
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to, _TOTAL_TOKEN_AMOUNT_.sub(allocatedToken));
        _TOTAL_TOKEN_AMOUNT_ = allocatedToken;
    }

    // ============ Timeline Control Functions ============

    function isDepositOpen() public view returns (bool) {
        return
            block.timestamp >= _START_TIME_ &&
            block.timestamp < _START_TIME_.add(_BIDDING_DURATION_);
    }

    function isFundingEnd() public view returns (bool) {
        return block.timestamp > _START_TIME_.add(_BIDDING_DURATION_).add(_COOLING_DURATION_);
    }

    function isSettled() public view returns (bool) {
        return _FINAL_PRICE_ != 0;
    }
}
