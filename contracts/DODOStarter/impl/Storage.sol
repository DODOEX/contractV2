/*

    Copyright 2022 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

contract Storage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    bool public _FORCE_STOP_ = false;
    address public _QUOTA_; 

    // ============ Events ============
    event ForceStop();

    // ============ Token & Balance ============

    uint256 public _FUNDS_RESERVE_;
    address public _FUNDS_ADDRESS_;
    address public _TOKEN_ADDRESS_;
    uint256 public _TOTAL_TOKEN_AMOUNT_;

    uint256 public _TOTAL_RAISED_FUNDS_;
    
    // ============ Vesting Timeline ============

    uint256 public _TOKEN_VESTING_START_;
    uint256 public _TOKEN_VESTING_DURATION_;
    uint256 public _TOKEN_CLIFF_RATE_;
    mapping(address => uint256) _CLAIMED_TOKEN_;

    uint256 public _FUNDS_VESTING_START_;
    uint256 public _FUNDS_VESTING_DURATION_;
    uint256 public _FUNDS_CLIFF_RATE_;
    uint256 _CLAIMED_FUNDS_;

    uint256 public _LP_VESTING_START_;
    uint256 public _LP_VESTING_DURATION_;
    uint256 public _LP_CLIFF_RATE_;
    uint256 _CLAIMED_LP_;

    // ============ Liquidity Params ============

    address public _POOL_FACTORY_;
    address public _INITIAL_POOL_;
    uint256 public _INITIAL_FUND_LIQUIDITY_;
    uint256 public _TOTAL_LP_;
    
    // ============ Timeline ==============
    uint256 public _START_TIME_;
    uint256 public _BIDDING_DURATION_;


    // ============ Events ============
    event SetQuota(address quota);

    // ============ Modifiers ============
    modifier isNotForceStop() {
        require(!_FORCE_STOP_, "FORCE_STOP");
        _;
    }

    // ============ Ownable Control ============
    function forceStop() external onlyOwner {
        require(block.timestamp < _START_TIME_, "FUNDING_ALREADY_STARTED");
        _FORCE_STOP_ = true;
        _TOTAL_TOKEN_AMOUNT_ = 0;
        uint256 tokenAmount = IERC20(_TOKEN_ADDRESS_).balanceOf(address(this));
        IERC20(_TOKEN_ADDRESS_).safeTransfer(_OWNER_, tokenAmount);

        emit ForceStop();
    }

    function setQuota(address quota) external onlyOwner {
        _QUOTA_ = quota;
        emit SetQuota(quota);
    }
}