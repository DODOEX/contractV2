/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";

interface IConstFeeRateModel {
    function init(address owner, uint256 feeRate) external;

    function setFeeRate(uint256 newFeeRate) external;

    function getFeeRate(address trader) external view returns (uint256);
}

contract ConstFeeRateModel is InitializableOwnable {
    uint256 public _FEE_RATE_;

    function init(address owner, uint256 feeRate) external {
        initOwner(owner);
        _FEE_RATE_ = feeRate;
    }

    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        _FEE_RATE_ = newFeeRate;
    }

    function getFeeRate(address trader) external view returns (uint256) {
        return _FEE_RATE_;
    }
}
