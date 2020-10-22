/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IBasicVault {
  function controller() external view returns(address);
  function getReserve(address token) external view returns(address);
  function transferOut(address token, address to, uint256 amount) external;
}