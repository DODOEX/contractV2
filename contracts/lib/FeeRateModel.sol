/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";

interface IFeeRateModel {
    function getFeeRate(address trader) external view returns (uint256);
    function init(address owner, uint256 feeRate) external;
    function setFeeRate(uint256 newFeeRate) external;
}

contract FeeRateModel is InitializableOwnable {
    //DEFAULT
    uint256 public _FEE_RATE_;
    mapping(address => uint256) feeMapping;

    function init(address owner, uint256 feeRate) external {
        initOwner(owner);
        _FEE_RATE_ = feeRate;
    }

    function setSpecificFeeRate(address trader, uint256 feeRate) external onlyOwner {
        require(trader != address(0), "INVALID ADDRESS!");
        feeMapping[trader] = feeRate;
    }

    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        _FEE_RATE_ = newFeeRate;
    }

    function getFeeRate(address trader) external view returns (uint256) {
        uint256 feeRate = feeMapping[trader];
        if(feeRate == 0)
            return _FEE_RATE_;
        return feeRate;
    }
}
