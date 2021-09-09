/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

interface IControllerModel {
    function getMintFee(address filterAdminAddr) external view returns (uint256);

    function getBurnFee(address filterAdminAddr) external view returns (uint256);

    function getEmergencySwitch(address filter) external view returns (bool);
}