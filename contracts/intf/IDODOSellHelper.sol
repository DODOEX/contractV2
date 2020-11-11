/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDODOSellHelper {
    function querySellQuoteToken(address dodo, uint256 amount) external view returns (uint256);
    function querySellBaseToken(address dodo, uint256 amount) external view returns (uint256);
}
