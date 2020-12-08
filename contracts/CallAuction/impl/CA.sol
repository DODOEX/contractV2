/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {CAVesting} from "./CAVesting.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";

contract CA is CAVesting {
    function init(
        address[] calldata addressList,
        uint256[] calldata timeLine,
        uint256[] calldata valueList,
        bytes calldata basePayBackData,
        bytes calldata quotePayBackData
    ) external {
        /*
        Address List
        0. owner
        1. baseToken
        2. quoteToken
        3. basePayBack
        4. quotePayBack
        5. permissionManager
      */

        initOwner(addressList[0]);
        _BASE_TOKEN_ = IERC20(addressList[1]);
        _QUOTE_TOKEN_ = IERC20(addressList[2]);
        _BASE_PAY_BACK_ = addressList[3];
        _QUOTE_PAY_BACK_ = addressList[4];
        _BIDDER_PERMISSION_ = IPermissionManager(addressList[5]);

        /*
        Time Line
        0. phase bid starttime
        1. phase bid endtime
        2. phase calm endtime
        3. start vesting time
        4. vesting duration
        */

        require(
            block.timestamp <= timeLine[0] &&
                timeLine[0] <= timeLine[1] &&
                timeLine[1] <= timeLine[2] &&
                timeLine[2] <= timeLine[3],
            "TIMELINE_WRONG"
        );

        _PHASE_BID_STARTTIME_ = timeLine[0];
        _PHASE_BID_ENDTIME_ = timeLine[1];
        _PHASE_CALM_ENDTIME_ = timeLine[2];
        _START_VESTING_TIME_ = timeLine[3];

        _VESTING_DURATION_ = timeLine[4];

        /*
        Value List
        0. quote cap
        1. cliff rate
        2. k
        3. i
        */

        require(
            valueList[1] <= 10**18 &&
                valueList[2] <= 10**18 &&
                valueList[3] > 0 &&
                valueList[3] <= 10**36,
            "VALUE_RANGE_WRONG"
        );

        _QUOTE_CAP_ = valueList[0];
        _CLIFF_RATE_ = valueList[1];
        _K_ = valueList[2];
        _I_ = valueList[3];

        // ============ External Call Data ============

        _BASE_PAY_BACK_CALL_DATA_ = basePayBackData;
        _QUOTE_PAY_BACK_CALL_DATA_ = quotePayBackData;
    }
}
