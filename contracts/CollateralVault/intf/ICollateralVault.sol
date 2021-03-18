/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface ICollateralVault {
    function _OWNER_() external returns (address);

    function transferOwner(address to) external;
}
