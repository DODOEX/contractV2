/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

interface IFeeModel {
    function getNFTInFee(address filterAdminAddr, address user) external view returns(uint256);

    function getNFTRandomOutFee(address filterAdminAddr, address user) external view returns(uint256);

    function getNFTTargetOutFee(address filterAdminAddr, address user) external view returns(uint256);
}