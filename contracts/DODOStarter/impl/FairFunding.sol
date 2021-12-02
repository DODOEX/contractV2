/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IQuota} from "../../DODOFee/UserQuota.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {Vesting} from "./Vesting.sol";

contract FairFunding is Vesting {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Fair Mode ============
    uint256 public _COOLING_DURATION_;

    mapping(address => uint256) _FUNDS_DEPOSITED_;
    mapping(address => bool) _FUNDS_CLAIMED_;
    uint256 public _USED_FUND_RATIO_;
    uint256 public _FINAL_PRICE_;

    uint256 public _LOWER_LIMIT_PRICE_;
    uint256 public _UPPER_LIMIT_PRICE_;

    // ============ Init ============
    function init(
        address[] calldata addressList,
        uint256[] calldata timeLine,
        uint256[] calldata valueList
    ) external {
        /*
        Address List
        0. owner
        1. sellToken
        2. fundToken
        3. quotaManager
        4. poolFactory
      */

        require(addressList.length == 5, "ADDR_LENGTH_WRONG");

        initOwner(addressList[0]);
        _TOKEN_ADDRESS_ = addressList[1];
        _FUNDS_ADDRESS_ = addressList[2];
        _QUOTA_ = addressList[3];
        _POOL_FACTORY_ = addressList[4];

        /*
        Time Line
        0. starttime
        1. bid duration
        2. calm duration
        3. token vesting starttime
        4. token vesting duration
        5. fund vesting starttime
        6. fund vesting duration
        7. lp vesting starttime
        8. lp vesting duration
        */

        require(timeLine.length == 9, "TIME_LENGTH_WRONG");

        _START_TIME_ = timeLine[0];
        _BIDDING_DURATION_ = timeLine[1];
        _COOLING_DURATION_ = timeLine[2];

        _TOKEN_VESTING_START_ = timeLine[3];
        _TOKEN_VESTING_DURATION_ = timeLine[4];

        _FUNDS_VESTING_START_ = timeLine[5];
        _FUNDS_VESTING_DURATION_ = timeLine[6];

        _LP_VESTING_START_ = timeLine[7];
        _LP_VESTING_DURATION_ = timeLine[8];

        require(block.timestamp <= _START_TIME_, "START_TIME_WRONG");
        require(_START_TIME_.add(_BIDDING_DURATION_).add(_COOLING_DURATION_) <= _TOKEN_VESTING_START_, "TOKEN_VESTING_TIME_WRONG");
        require(_START_TIME_.add(_BIDDING_DURATION_).add(_COOLING_DURATION_) <= _FUNDS_VESTING_START_, "FUND_VESTING_TIME_WRONG");

        /*
        Value List
        0. lower price
        1. upper price
        2. token cliffRate
        3. fund cliffRate
        4. lp cliffRate
        5. initial liquidity
        */

        require(valueList.length == 6, "VALUE_LENGTH_WRONG");

        _LOWER_LIMIT_PRICE_ = valueList[0];
        _UPPER_LIMIT_PRICE_ = valueList[1];

        _TOKEN_CLIFF_RATE_ = valueList[2];
        _FUNDS_CLIFF_RATE_ = valueList[3];
        _LP_CLIFF_RATE_ = valueList[4];

        _INITIAL_FUND_LIQUIDITY_ = valueList[5];

        require(_LOWER_LIMIT_PRICE_ <= _UPPER_LIMIT_PRICE_, "PRICE_WRONG");
        require(_TOKEN_CLIFF_RATE_ <= 1e18, "TOKEN_CLIFF_RATE_WRONG");
        require(_FUNDS_CLIFF_RATE_ <= 1e18, "FUND_CLIFF_RATE_WRONG");
        require(_LP_CLIFF_RATE_ <= 1e18, "LP_CLIFF_RATE_WRONG");

        _TOTAL_TOKEN_AMOUNT_ = IERC20(_TOKEN_ADDRESS_).balanceOf(address(this));
    }

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

    function settle() public isForceStop {
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

    function depositFunds(address to) external preventReentrant isForceStop {
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

    function claimToken(address to) external {
        uint256 totalAllocation = getUserTokenAllocation(msg.sender);
        _claimToken(to, totalAllocation);
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
