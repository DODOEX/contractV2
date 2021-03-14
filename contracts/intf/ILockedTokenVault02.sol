/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface ILockedTokenVault02 {
    function tradeIncentive(address trader, uint256 amount) external;
}
