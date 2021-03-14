/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDODOIncentiveBsc {
    function triggerIncentive(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 returnAmount,
        address assetTo
    ) external;
}
