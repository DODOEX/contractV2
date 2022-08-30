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


contract InstantFundingV2 is Vesting {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Instant Commit Mode ============
    uint256 public _START_PRICE_;
    uint256 public _END_PRICE_;

    mapping(address => uint256) _FUNDS_USED_;
    mapping(address => uint256) _TOKEN_ALLOCATION_;
    uint256 public _TOTAL_ALLOCATED_TOKEN_;

    bool public _HAS_DEPOSIT_SELLTOKEN = false;

    // ============ Events ============
    event DepositFund(address indexed account, uint256 fundAmount, uint256 allocationAmount);
    event ClaimToken(address indexed caller, address indexed to, uint256 tokenAmount);

    event WithdrawUnallocatedToken(address indexed to, uint256 tokenAmount);
    event InitializeLiquidity(address pool, uint256 tokenAmount);
    event ClaimFund(address indexed to, uint256 fundAmount);

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
        2. token vesting starttime
        3. token vesting duration
        4. fund vesting starttime
        5. fund vesting duration
        6. lp vesting starttime
        7. lp vesting duration
        */

        require(timeLine.length == 8, "TIME_LENGTH_WRONG");

        _START_TIME_ = timeLine[0];
        _BIDDING_DURATION_ = timeLine[1];

        _TOKEN_VESTING_START_ = timeLine[2];
        _TOKEN_VESTING_DURATION_ = timeLine[3];

        _FUNDS_VESTING_START_ = timeLine[4];
        _FUNDS_VESTING_DURATION_ = timeLine[5];

        _LP_VESTING_START_ = timeLine[6];
        _LP_VESTING_DURATION_ = timeLine[7];

        require(block.timestamp <= _START_TIME_, "START_TIME_WRONG");
        require(_START_TIME_.add(_BIDDING_DURATION_) <= _TOKEN_VESTING_START_, "TOKEN_VESTING_TIME_WRONG");
        require(_START_TIME_.add(_BIDDING_DURATION_) <= _FUNDS_VESTING_START_, "FUND_VESTING_TIME_WRONG");
        require(_START_TIME_.add(_BIDDING_DURATION_) <= _LP_VESTING_START_, "LP_VESTING_TIME_WRONG");

        /*
        Value List
        0. start price
        1. end price
        2. token cliffRate
        3. fund cliffRate
        4. lp cliffRate
        5. initial liquidity
        */

        require(valueList.length == 6, "VALUE_LENGTH_WRONG");

        _START_PRICE_ = valueList[0];
        _END_PRICE_ = valueList[1];

        _TOKEN_CLIFF_RATE_ = valueList[2];
        _FUNDS_CLIFF_RATE_ = valueList[3];
        _LP_CLIFF_RATE_ = valueList[4];

        _INITIAL_FUND_LIQUIDITY_ = valueList[5];

        require(_START_PRICE_ > 0, "START_PRICE_INVALID");
        require(_END_PRICE_ > 0, "END_PRICE_INVALID");
        require(_TOKEN_CLIFF_RATE_ <= 1e18, "TOKEN_CLIFF_RATE_WRONG");
        require(_FUNDS_CLIFF_RATE_ <= 1e18, "FUND_CLIFF_RATE_WRONG");
        require(_LP_CLIFF_RATE_ <= 1e18, "LP_CLIFF_RATE_WRONG");
    }

    function ownerDepositSellToken(uint256 sellTokenAmount) external onlyOwner {
        require(_HAS_DEPOSIT_SELLTOKEN == false, "ALREADY_DEPOSITED_TOKEN");
        IERC20(_TOKEN_ADDRESS_).safeTransferFrom(msg.sender, address(this), sellTokenAmount);
        _TOTAL_TOKEN_AMOUNT_ = IERC20(_TOKEN_ADDRESS_).balanceOf(address(this));

        require(_TOTAL_TOKEN_AMOUNT_ > 0, "NO_TOKEN_TRANSFERED");
        _HAS_DEPOSIT_SELLTOKEN = true;
    }

    // ============ View Functions ============
    function getCurrentPrice() public view returns (uint256 price) {
        if (block.timestamp <= _START_TIME_) {
            price = _START_PRICE_;
        } else if (block.timestamp >= _START_TIME_.add(_BIDDING_DURATION_)) {
            price = _END_PRICE_;
        } else {
            uint256 timePast = block.timestamp.sub(_START_TIME_);
            price = _START_PRICE_.mul(_BIDDING_DURATION_.sub(timePast)).div(_BIDDING_DURATION_).add(
                _END_PRICE_.mul(timePast).div(_BIDDING_DURATION_)
            );
        }
    }

    function getUserTokenAllocation(address user) public view returns (uint256) {
        return _TOKEN_ALLOCATION_[user];
    }

    function getUserFundsUsed(address user) public view returns (uint256) {
        return _FUNDS_USED_[user];
    }

    // ============ Funding Functions ============

    function depositFunds(address to)
        external
        preventReentrant
        isNotForceStop
        returns (uint256 newTokenAllocation)
    {
        require(_HAS_DEPOSIT_SELLTOKEN, "SELLTOKEN_NOT_DEPOSITED");
        require(isDepositOpen(), "DEPOSIT_NOT_OPEN");
        // input fund check
        uint256 inputFund = IERC20(_FUNDS_ADDRESS_).balanceOf(address(this)).sub(_FUNDS_RESERVE_);

        if (_QUOTA_ != address(0)) {
            require(
                inputFund.add(_FUNDS_USED_[to]) <= uint256(IQuota(_QUOTA_).getUserQuota(to)),
                "QUOTA_EXCEED"
            );
        }

        // allocation calculation
        uint256 currentPrice = getCurrentPrice();
        newTokenAllocation = DecimalMath.divFloor(inputFund, currentPrice);

        uint256 depositFundAmount = inputFund;
        if (newTokenAllocation.add(_TOTAL_ALLOCATED_TOKEN_) > _TOTAL_TOKEN_AMOUNT_) {
            newTokenAllocation = _TOTAL_TOKEN_AMOUNT_.sub(_TOTAL_ALLOCATED_TOKEN_);
            uint256 fundUsed = DecimalMath.mulFloor(newTokenAllocation, currentPrice);
            _FUNDS_USED_[to] = _FUNDS_USED_[to].add(fundUsed);
            _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.add(fundUsed);
            _FUNDS_RESERVE_ = _FUNDS_RESERVE_.add(fundUsed);
            depositFundAmount = fundUsed;

            IERC20(_FUNDS_ADDRESS_).safeTransfer(to, inputFund.sub(fundUsed));
        } else {
            _FUNDS_USED_[to] = _FUNDS_USED_[to].add(inputFund);
            _TOTAL_RAISED_FUNDS_ = _TOTAL_RAISED_FUNDS_.add(inputFund);
            _FUNDS_RESERVE_ = _FUNDS_RESERVE_.add(inputFund);
        }

        _TOKEN_ALLOCATION_[to] = _TOKEN_ALLOCATION_[to].add(newTokenAllocation);
        _TOTAL_ALLOCATED_TOKEN_ = _TOTAL_ALLOCATED_TOKEN_.add(newTokenAllocation);

        emit DepositFund(to, depositFundAmount, newTokenAllocation);
    }

    function claimToken(address to) external preventReentrant {
        uint256 totalAllocation = getUserTokenAllocation(msg.sender);
        uint256 claimableTokenAmount = _claimToken(to, totalAllocation);

        emit ClaimToken(msg.sender, to, claimableTokenAmount);
    }

    // ============ Ownable Functions ============

    function withdrawUnallocatedToken(address to) external preventReentrant onlyOwner {
        require(isFundingEnd(), "CAN_NOT_WITHDRAW");
        uint256 unallocatedAmount = _TOTAL_TOKEN_AMOUNT_.sub(_TOTAL_ALLOCATED_TOKEN_);
        IERC20(_TOKEN_ADDRESS_).safeTransfer(to, unallocatedAmount);
        _TOTAL_TOKEN_AMOUNT_ = _TOTAL_ALLOCATED_TOKEN_;

        emit WithdrawUnallocatedToken(to, unallocatedAmount);
    }

    function initializeLiquidity(uint256 initialTokenAmount, uint256 lpFeeRate, bool isOpenTWAP) external preventReentrant onlyOwner {
        require(isFundingEnd(),"FUNDING_NOT_FINISHED");
        _initializeLiquidity(initialTokenAmount, _TOTAL_RAISED_FUNDS_, lpFeeRate, isOpenTWAP);

        emit InitializeLiquidity(_INITIAL_POOL_, initialTokenAmount);
    }

    function claimFund(address to) external preventReentrant onlyOwner {
        uint256 claimableFund = _claimFunds(to,_TOTAL_RAISED_FUNDS_);

        emit ClaimFund(to, claimableFund);
    }

    // ============ Timeline Control Functions ============

    function isDepositOpen() public view returns (bool) {
        return
            block.timestamp >= _START_TIME_ &&
            block.timestamp < _START_TIME_.add(_BIDDING_DURATION_);
    }

    function isFundingEnd() public view returns (bool) {
        return block.timestamp > _START_TIME_.add(_BIDDING_DURATION_);
    }


    // ============ Version Control ============

    function version() virtual public pure returns (string memory) {
        return "InstantFunding 2.1.1";
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
        userFundAmount =  _FUNDS_USED_[user];
        currentPrice = getCurrentPrice();
        soldTokenAmount = _TOTAL_ALLOCATED_TOKEN_;

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
            claimedTokenAmount = 0;
        }

        totalClaimAmount = getUserTokenAllocation(user);


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
        uint256 price0, //_START_PRICE_
        uint256 price1, //_END_PRICE_
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
        price0 = _START_PRICE_;
        price1 = _END_PRICE_;
        
        versionType = version();

        startTime = _START_TIME_;
        bidDuration = _BIDDING_DURATION_;
        tokenVestingStart = _TOKEN_VESTING_START_;
        tokenVestingDuration = _TOKEN_VESTING_DURATION_;
        tokenCliffRate = _TOKEN_CLIFF_RATE_;
    }
}
