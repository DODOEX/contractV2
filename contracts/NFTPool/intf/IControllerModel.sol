/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

interface IControllerModel {
    function getNFTInFee(address filterAdminAddr, address user) external view returns(uint256);

    function getNFTRandomOutFee(address filterAdminAddr, address user) external view returns(uint256);

    function getNFTTargetOutFee(address filterAdminAddr, address user) external view returns(uint256);

    function getEmergencySwitch(address filter) external view returns(bool);
}