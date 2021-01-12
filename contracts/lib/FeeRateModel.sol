/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";

interface IFeeRateModel {
    function getFeeRate(address trader) external view returns (uint256);
    function init(address owner, uint256 feeRate) external;
    function setFeeRate(uint256 newFeeRate) external;
}

contract FeeRateModel is ReentrancyGuard,InitializableOwnable {
    //DEFAULT
    uint256 public _FEE_RATE_;
    mapping(address => uint256) feeMapping;
    event SetSpecificFeeRate(bool result);
    event SetFeeRate(bool result);
    

    function init(address owner, uint256 feeRate) external {
        initOwner(owner);
        _FEE_RATE_ = feeRate;
    }

    function setSpecificFeeRate(address trader, uint256 feeRate, address logicContractAddr) external onlyOwner {
        bool r;
        (r, ) = logicContractAddr.delegatecall(abi.encodeWithSignature("setSpecificFeeRate(address,uint256)", trader,feeRate));
        emit SetSpecificFeeRate(r);
    }

    function setFeeRate(uint256 newFeeRate, address logicContractAddr) external onlyOwner {
        bool r;
        (r, ) = logicContractAddr.delegatecall(abi.encodeWithSignature("setFeeRate(uint256)", newFeeRate));
        emit SetFeeRate(r); 
        
    }

    function getFeeRate(address trader) external view returns (uint256) {
        uint256 feeRate = feeMapping[trader];
        if(feeRate == 0)
            return _FEE_RATE_;
        return feeRate;
    }
}
