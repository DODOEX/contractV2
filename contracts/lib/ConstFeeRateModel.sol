/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IFeeRateModel} from "../intf/IFeeRateModel.sol";
import {Ownable} from "../lib/Ownable.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";

interface IConstFeeRateModel {
    function init(address owner, uint256 feeRate) external;

    function setFeeRate(uint256 newFeeRate) external;

    function getFeeRate(address, uint256) external view returns (uint256);
}

contract ConstFeeRateModel is InitializableOwnable, IFeeRateModel {
    uint256 public _FEE_RATE_;

    function init(address owner, uint256 feeRate) external {
        initOwner(owner);
        _FEE_RATE_ = feeRate;
    }

    function setFeeRate(uint256 newFeeRate) external {
        _FEE_RATE_ = newFeeRate;
    }

    function getFeeRate(address, uint256) external override view returns (uint256) {
        return _FEE_RATE_;
    }
}
