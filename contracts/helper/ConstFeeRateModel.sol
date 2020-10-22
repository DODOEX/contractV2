/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IFeeRateModel} from "../intf/IFeeRateModel.sol";

contract ConstFeeRateModel is IFeeRateModel {
    uint256 public _FEE_RATE_;

    constructor(uint256 feeRate) public {
        feeRate = _FEE_RATE_;
    }

    function getFeeRate(uint256) external override view returns (uint256) {
        return _FEE_RATE_;
    }
}
