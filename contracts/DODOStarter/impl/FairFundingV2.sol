/*

    Copyright 2022 DODO ZOO.
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

contract FairFundingV2 is Vesting {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 internal constant _SETTEL_FUND_ = 2e17;
    // ============ Fair Mode ============
    uint256 public _COOLING_DURATION_;

    mapping(address => uint256) _FUNDS_DEPOSITED_;
    mapping(address => bool) _FUNDS_CLAIMED_;
    uint256 public _USED_FUND_RATIO_;
    uint256 public _FINAL_PRICE_;

    uint256 public _LOWER_LIMIT_PRICE_;
    uint256 public _UPPER_LIMIT_PRICE_;

    bool public _IS_OVERCAP_STOP = false;
    bool public _HAS_DEPOSIT_SELLTOKEN = false;


    // ============ Events ============
    event Settle(address indexed account);
    event DepositFund(address indexed account, uint256 fundAmount);
    event WithdrawFund(address indexed caller, address indexed to, uint256 fundAmount, bool isSettled);
    event ClaimToken(address indexed caller, address indexed to, uint256 tokenAmount, uint256 fundAmount);

    event WithdrawUnallocatedToken(address indexed to, uint256 tokenAmount);
    event InitializeLiquidity(address pool, uint256 tokenAmount);
    event ClaimFund(address indexed to, uint256 fundAmount);

    // ============ Init ============
    function init(
        address[] calldata addressList,
        uint256[] calldata timeLine,
        uint256[] calldata valueList,
        bool isOverCapStop
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
        require(_START_TIME_.add(_BIDDING_DURATION_).add(_COOLING_DURATION_) <= _LP_VESTING_START_, "LP_VESTING_TIME_WRONG");

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

        require(_LOWER_LIMIT_PRICE_ > 0, "LOWER_PRICE_WRONG");
        require(_LOWER_LIMIT_PRICE_ <= _UPPER_LIMIT_PRICE_, "PRICE_WRONG");
        require(_TOKEN_CLIFF_RATE_ <= 1e18, "TOKEN_CLIFF_RATE_WRONG");
        require(_FUNDS_CLIFF_RATE_ <= 1e18, "FUND_CLIFF_RATE_WRONG");
        require(_LP_CLIFF_RATE_ <= 1e18, "LP_CLIFF_RATE_WRONG");

        _IS_OVERCAP_STOP = isOverCapStop;
    }

    function ownerDepositSellToken(uint256 sellTokenAmount) external payable onlyOwner {
        require(_HAS_DEPOSIT_SELLTOKEN == false, "ALREADY_DEPOSITED_TOKEN");
        IERC20(_TOKEN_ADDRESS_).safeTransferFrom(msg.sender, address(this), sellTokenAmount);
        _TOTAL_TOKEN_AMOUNT_ = IERC20(_TOKEN_ADDRESS_).balanceOf(address(this));

        require(_TOTAL_TOKEN_AMOUNT_ > 0, "NO_TOKEN_TRANSFERED");
        require(msg.value == _SETTEL_FUND_, "SETTLE_FUND_NOT_MATCH");
        _HAS_DEPOSIT_SELLTOKEN = true;
    }

    // ============ View Functions ============

    function getCurrentPrice() public view returns (uint256) {
        return getPrice(_TOTAL_RAISED_FUNDS_);
    }

    function getPrice(uint256 fundAmount) public view returns (uint256 price) {
        if(_FINAL_PRICE_ != 0) 
            price = _FINAL_PRICE_;
        else {
            price = DecimalMath.divFloor(fundAmount, _TOTAL_TOKEN_AMOUNT_);
            if (price < _LOWER_LIMIT_PRICE_) {
                price = _LOWER_LIMIT_PRICE_;
            }
            if (price > _UPPER_LIMIT_PRICE_) {
                price = _UPPER_LIMIT_PRICE_;
            }
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

    function settle() public isNotForceStop preventReentrant {
        require(_FINAL_PRICE_ == 0 && isFundingEnd(), "CAN_NOT_SETTLE");
        _FINAL_PRICE_ = getCurrentPrice();
        if(_TOTAL_RAISED_FUNDS_ == 0) {
            return;
        } 
        _USED_FUND_RATIO_ = DecimalMath.divFloor(
            DecimalMath.mulFloor(_TOTAL_TOKEN_AMOUNT_, _FINAL_PRICE_),
            _TOTAL_RAISED_FUNDS_
        );
        if (_USED_FUND_RATIO_ > DecimalMath.ONE) {
            _USED_FUND_RATIO_ = DecimalMath.ONE;
        }

         msg.sender.transfer(_SETTEL_FUND_);

         emit Settle(msg.sender);
    }

    // ============ Funding Functions ============

    function depositFunds(address to) external preventReentrant isNotForceStop returns(uint256 inputFund) {
        require(_HAS_DEPOSIT_SELLTOKEN, "SELLTOKEN_NOT_DEPOSITED");
        require(isDepositOpen(), "DEPOSIT_NOT_OPEN");

        uint256 currentFundBalance = IERC20(_FUNDS_ADDRESS_).balanceOf(address(this));

        if(_IS_OVERCAP_STOP) {
            require(currentFundBalance <= DecimalMath.mulFloor(_TOTAL_TOKEN_AMOUNT_, _UPPER_LIMIT_PRICE_), "ALREADY_OVER_CAP");
        }        

        // input fund check
        inputFund = currentFundBalance.sub(_FUNDS_RESERVE_);

        if (_QUOTA_ != address(0)) {
            require(
                inputFund.add(_FUNDS_DEPOSITED_[to]) <= uint256(IQuota(_QUOTA_).getUserQuota(to)),
                "QUOTA_EXCEED"
            );
        }

        _FUNDS_RESERVE_ = _FUNDS_RESERVE_.add(inputFund);
        _FUNDS_DEPOSITED_[to] = _FUNDS_DEPOSITED_[to].add(inputFund);
        _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.add(inputFund);

        emit DepositFund(to, inputFund);
    }

    function withdrawFunds(address to, uint256 amount) external preventReentrant {
        uint256 fundAmount;
        bool isSettled = isSettled();
        if (!isSettled) {
            require(_FUNDS_DEPOSITED_[msg.sender] >= amount, "WITHDRAW_TOO_MUCH");
            _FUNDS_DEPOSITED_[msg.sender] = _FUNDS_DEPOSITED_[msg.sender].sub(amount);
            _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.sub(amount);
            _FUNDS_RESERVE_ = _FUNDS_RESERVE_.sub(amount);
            fundAmount = amount;
            IERC20(_FUNDS_ADDRESS_).safeTransfer(to, amount);
        } else {
            require(!_FUNDS_CLAIMED_[msg.sender], "ALREADY_CLAIMED");
            _FUNDS_CLAIMED_[msg.sender] = true;
            fundAmount = getUserFundsUnused(msg.sender);
            IERC20(_FUNDS_ADDRESS_).safeTransfer(to, fundAmount);
        }

        emit WithdrawFund(msg.sender, to, fundAmount, isSettled);
    }

    function claimToken(address to) external preventReentrant {
        require(isSettled(), "NOT_SETTLED");
        uint256 totalAllocation = getUserTokenAllocation(msg.sender);
        uint256 claimableTokenAmount = _claimToken(to, totalAllocation);

        uint256 fundAmount = 0;
        if(!_FUNDS_CLAIMED_[msg.sender]) {
            _FUNDS_CLAIMED_[msg.sender] = true;
            fundAmount = getUserFundsUnused(msg.sender);
            IERC20(_FUNDS_ADDRESS_).safeTransfer(to, fundAmount);
        }

        emit ClaimToken(msg.sender, to, claimableTokenAmount, fundAmount);
    }    

    // ============ Ownable Functions ============

    function withdrawUnallocatedToken(address to) external preventReentrant onlyOwner {
        require(isSettled(), "NOT_SETTLED");
        require(_FINAL_PRICE_ == _LOWER_LIMIT_PRICE_, "NO_TOKEN_LEFT");
        uint256 allocatedToken = DecimalMath.divCeil(_TOTAL_RAISED_FUNDS_, _FINAL_PRICE_);
        uint256 unallocatedAmount = _TOTAL_TOKEN_AMOUNT_.sub(allocatedToken);
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to, unallocatedAmount);
        _TOTAL_TOKEN_AMOUNT_ = allocatedToken;

        emit WithdrawUnallocatedToken(to, unallocatedAmount);
    }

    function initializeLiquidity(uint256 initialTokenAmount, uint256 lpFeeRate, bool isOpenTWAP) external preventReentrant onlyOwner {
        require(isSettled(), "NOT_SETTLED");
        uint256 totalUsedRaiseFunds = DecimalMath.mulFloor(_TOTAL_RAISED_FUNDS_, _USED_FUND_RATIO_);
        _initializeLiquidity(initialTokenAmount, totalUsedRaiseFunds, lpFeeRate, isOpenTWAP);

        emit InitializeLiquidity(_INITIAL_POOL_, initialTokenAmount);
    }

    function claimFund(address to) external preventReentrant onlyOwner {
        require(isSettled(), "NOT_SETTLED");
        uint256 totalUsedRaiseFunds = DecimalMath.mulFloor(_TOTAL_RAISED_FUNDS_, _USED_FUND_RATIO_);
        uint256 claimableFund = _claimFunds(to,totalUsedRaiseFunds);

        emit ClaimFund(to, claimableFund);
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

    // ============ Version Control ============

    function version() virtual public pure returns (string memory) {
        return "FairFunding 2.1.1";
    }

    // ============ View Helper  ==============
    function getCurrentFundingInfo(address user) external view returns(
        uint256 raiseFundAmount,
        uint256 userFundAmount,
        uint256 currentPrice,
        uint256 soldTokenAmount,
        uint256 totalClaimAmount,
        uint256 claimableTokenAmount,
        uint256 claimedTokenAmount,
        bool isHaveCap,
        uint256 userQuota,
        uint256 userCurrentQuota
    ) {
        raiseFundAmount =_TOTAL_RAISED_FUNDS_;
        userFundAmount =  _FUNDS_DEPOSITED_[user];
        currentPrice = getCurrentPrice();
        uint256 tmpSoldTokenAmount = DecimalMath.divCeil(_TOTAL_RAISED_FUNDS_, currentPrice);
        soldTokenAmount = tmpSoldTokenAmount > _TOTAL_TOKEN_AMOUNT_ ? _TOTAL_TOKEN_AMOUNT_ : tmpSoldTokenAmount;

        if(block.timestamp > _TOKEN_VESTING_START_) {
            uint256 totalAllocation = getUserTokenAllocation(user);
            uint256 remainingToken = DecimalMath.mulFloor(
                getRemainingRatio(block.timestamp,0),
                totalAllocation
            );
            claimedTokenAmount = _CLAIMED_TOKEN_[user];
            claimableTokenAmount = totalAllocation.sub(remainingToken).sub(claimedTokenAmount);
        }else {
            claimableTokenAmount = 0;
            claimedTokenAmount =0;
        }

        if(raiseFundAmount == 0) {
            totalClaimAmount = 0;
        } else {
            uint256 usedFundRatio = DecimalMath.divFloor(
                DecimalMath.mulFloor(_TOTAL_TOKEN_AMOUNT_, currentPrice),
                raiseFundAmount
            );

            if (usedFundRatio > DecimalMath.ONE) {
                usedFundRatio = DecimalMath.ONE;
            }

            totalClaimAmount =  DecimalMath.divFloor(
                DecimalMath.mulFloor(userFundAmount, usedFundRatio),
                currentPrice
            );
        }

        if(_QUOTA_ == address(0)) {
            isHaveCap = false;
            userQuota = uint256(-1);
            userCurrentQuota = uint256(-1);
        } else {
            isHaveCap = true;
            userQuota = uint256(IQuota(_QUOTA_).getUserQuota(user));
            if(userQuota > userFundAmount) {
                userCurrentQuota = userQuota - userFundAmount;
            } else {
                userCurrentQuota = 0;
            }
        }
    }

    function getBaseFundInfo() external view returns(
        address tokenAddress,
        address fundAddress,
        uint256 totalTokenAmount,
        uint256 price0, //_LOWER_LIMIT_PRICE_
        uint256 price1, //_UPPER_LIMIT_PRICE_
        string memory versionType,
        uint256 startTime,
        uint256 bidDuration,
        uint256 tokenVestingStart,
        uint256 tokenVestingDuration,
        uint256 tokenCliffRate
    ) {
        tokenAddress = _TOKEN_ADDRESS_;
        fundAddress = _FUNDS_ADDRESS_;
        totalTokenAmount = _TOTAL_TOKEN_AMOUNT_;
        price0 = _LOWER_LIMIT_PRICE_;
        price1 = _UPPER_LIMIT_PRICE_;
        
        versionType = version();

        startTime = _START_TIME_;
        bidDuration = _BIDDING_DURATION_;
        tokenVestingStart = _TOKEN_VESTING_START_;
        tokenVestingDuration = _TOKEN_VESTING_DURATION_;
        tokenCliffRate = _TOKEN_CLIFF_RATE_;
    }


    function getFairFundInfo(address user) external view returns(
        bool isOverCapStop,
        uint256 finalPrice,
        uint256 userUnusedFundAmount,
        uint256 coolDuration,
        bool fundsClaimed
    ) {
        isOverCapStop = _IS_OVERCAP_STOP;
        finalPrice = _FINAL_PRICE_;
        userUnusedFundAmount = getUserFundsUnused(user);
        coolDuration = _COOLING_DURATION_;
        fundsClaimed = _FUNDS_CLAIMED_[user];
    }

}