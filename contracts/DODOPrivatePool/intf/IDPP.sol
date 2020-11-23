/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDPP {
    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        address lpFeeRateModel,
        address mtFeeRateModel,
        address kSource,
        address iSource,
        address gasPriceSource,
        address tradePermissionManager,
        address iSmartApprove
    ) external;
}
