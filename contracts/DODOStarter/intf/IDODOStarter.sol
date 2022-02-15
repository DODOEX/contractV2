/*

    Copyright 2022 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDODOStarter {
    //Instant mode
    function init(
        address[] calldata addressList,
        uint256[] calldata timeLine,
        uint256[] calldata valueList
    ) external;

    //Fair mode
    function init(
        address[] calldata addressList,
        uint256[] calldata timeLine,
        uint256[] calldata valueList,
        bool isOverCapStop
    ) external;

    function _FUNDS_ADDRESS_() external view returns (address);

    function depositFunds(address to) external returns (uint256);
}
