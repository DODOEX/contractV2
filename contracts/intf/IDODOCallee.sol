/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDODOCallee {
    function DVMSellShareCall(
        address sender,
        uint256 burnShareAmount,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata data
    ) external;

    function DVMFlashLoanCall(
        address sender,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata data
    ) external;

    function DPPWithdrawCall(
        address sender,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata data
    ) external;
}
