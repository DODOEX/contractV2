/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "./Ownable.sol";

interface IGasPriceSource {
    function setGasPrice(uint256) external;

    function getGasPrice() external view returns (uint256);
}

contract GasPriceSource is IGasPriceSource, Ownable {
    uint256 public _GAS_PRICE_;

    function setGasPrice(uint256 gasPrice) external override {
        _GAS_PRICE_ = gasPrice;
    }

    function getGasPrice() external override view returns (uint256) {
        return _GAS_PRICE_;
    }
}
