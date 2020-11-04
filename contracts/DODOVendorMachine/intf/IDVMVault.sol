/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDVMVault {
    function init(
        address owner,
        address _baseToken,
        address _quoteToken
    ) external;
}
