/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {CAVesting} from "./CAVesting.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IFeeRateModel} from "../../lib/FeeRateModel.sol";

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
        1. maintainer
        2. baseToken
        3. quoteToken
        4. basePayBack
        5. quotePayBack
        6. permissionManager
        7. feeRateModel
      */

        initOwner(addressList[0]);
        _MAINTAINER_ = addressList[1];
        _BASE_TOKEN_ = IERC20(addressList[2]);
        _QUOTE_TOKEN_ = IERC20(addressList[3]);
        _BASE_PAY_BACK_ = addressList[4];
        _QUOTE_PAY_BACK_ = addressList[5];
        _BIDDER_PERMISSION_ = IPermissionManager(addressList[6]);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(addressList[7]);

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
        4. owner ratio
        */

        require(
            valueList[1] <= 10**18 &&
                valueList[2] <= 10**18 &&
                valueList[3] > 0 &&
                valueList[3] <= 10**36 &&
                valueList[4] <= 10**18,
            "VALUE_RANGE_WRONG"
        );

        _QUOTE_CAP_ = valueList[0];
        _CLIFF_RATE_ = valueList[1];
        _K_ = valueList[2];
        _I_ = valueList[3];
        _OWNER_RATIO_ = valueList[4];

        // ============ External Call Data ============

        _BASE_PAY_BACK_CALL_DATA_ = basePayBackData;
        _QUOTE_PAY_BACK_CALL_DATA_ = quotePayBackData;
    }
}
