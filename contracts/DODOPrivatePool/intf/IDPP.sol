/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDPP {
    // function init(
    //     address owner,
    //     address maintainer,
    //     address baseTokenAddress,
    //     address quoteTokenAddress,
    //     address lpFeeRateModel,
    //     address mtFeeRateModel,
    //     address tradePermissionManager,
    //     address gasPriceSource,
    //     address iSource,
    //     address kSource,
    //     address iSmartApprove
    // ) external;

    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        address iSmartApprove,
        address[] memory configAddresses
    ) external;
}
