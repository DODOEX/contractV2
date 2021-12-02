/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IERC20} from "../../intf/IERC20.sol";

contract Storage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    bool public _FORCE_STOP_ = false;
    address public _QUOTA_; 

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


    // ============ Modifiers ============
    modifier isForceStop() {
        require(!_FORCE_STOP_, "FORCE_STOP");
        _;
    }

    function forceStop() external onlyOwner {
        require(block.timestamp < _START_TIME_, "FUNDING_ALREADY_STARTED");
        _FORCE_STOP_ = true;
        _TOTAL_TOKEN_AMOUNT_ = 0;
        uint256 tokenAmount = IERC20(_TOKEN_ADDRESS_).balanceOf(address(this));
        IERC20(_TOKEN_ADDRESS_).transfer(_OWNER_, tokenAmount);
    }
}