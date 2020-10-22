/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IFeeRateModel} from "../intf/IFeeRateModel.sol";
import {Ownable} from "../lib/Ownable.sol";

contract ConstFeeRateModel is Ownable, IFeeRateModel {
    uint256 public _FEE_RATE_;

    constructor(uint256 feeRate) public {
        feeRate = _FEE_RATE_;
    }

    function setFeeRate(uint256 newFeeRate) external {
        _FEE_RATE_ = newFeeRate;
    }

    function getFeeRate(uint256) external override view returns (uint256) {
        return _FEE_RATE_;
    }
}
