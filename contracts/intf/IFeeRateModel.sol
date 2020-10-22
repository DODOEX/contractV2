/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;


interface IFeeRateModel {
    function getFeeRate(uint256 amount) external view returns (uint256);
}
