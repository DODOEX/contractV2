/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IERC20} from "../../intf/IERC20.sol";

contract CAStorage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Timeline ============

    uint256 _PAHSE_SETTING_ENDTIME_;
    uint256 _PHASE_BID_ENDTIME_;
    uint256 _PHASE_CALM_ENDTIME_;
    bool _SETTLED_;

    // ============ Core Address ============

    IERC20 public _BASE_TOKEN_;
    IERC20 public _QUOTE_TOKEN_;
    address public _MAINTAINER_;
    address public _BASE_PAY_BACK_;
    address public _QUOTE_PAY_BACK_;

    // ============ Distribution Parameters ============

    uint256 _QUOTE_MAINTAINER_FEE_RATE_;
    bytes _BASE_PAY_BACK_CALL_DATA_;
    bytes _QUOTE_PAY_BACK_CALL_DATA_;

    // ============ Balances ============

    uint256 public _QUOTE_RESERVE_;
    uint256 public _BASE_RESERVE_;
    uint256 public _TOTAL_SOLD_BASE_;
    uint256 public _TOTAL_QUOTE_SHARES_;
    mapping(address => uint256) internal _QUOTE_SHARES_;
    mapping(address => uint256) internal _CLAIMED_BALANCES_;

    // ============ Time Lock ============

    uint256 public _START_VESTING_TIME_;
    uint256 public _VESTING_DURATION_;
    uint256 public _CLIFF_RATE_;

    // ============ PMM Parameters ============

    uint256 public _K_;
    uint256 public _I_;

    // ============ Modifiers ============

    modifier phaseSetting() {
        require(block.timestamp <= _PAHSE_SETTING_ENDTIME_, "NOT_PHASE_SETTING");
        _;
    }

    modifier phaseBid() {
        require(
            block.timestamp > _PAHSE_SETTING_ENDTIME_ && block.timestamp <= _PHASE_BID_ENDTIME_,
            "NOT_PHASE_BID"
        );
        _;
    }

    modifier phaseCalm() {
        require(
            block.timestamp > _PHASE_BID_ENDTIME_ && block.timestamp <= _PHASE_CALM_ENDTIME_,
            "NOT_PHASE_CALM"
        );
        _;
    }

    modifier phaseBidOrCalm() {
        require(
            block.timestamp > _PAHSE_SETTING_ENDTIME_ && block.timestamp <= _PHASE_CALM_ENDTIME_,
            "NOT_PHASE_BID_OR_CALM"
        );
        _;
    }

    modifier phaseSettlement() {
        require(block.timestamp > _PHASE_CALM_ENDTIME_, "NOT_PHASE_EXE");
        _;
    }

    modifier phaseVesting() {
        require(_SETTLED_, "NOT_VESTING");
        _;
    }
}
