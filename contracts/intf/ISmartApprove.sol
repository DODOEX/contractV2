/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface ISmartApprove {
    function claimTokens(address token,address who,address dest,uint256 amount) external;
    function getSmartSwap() external view returns (address);
}