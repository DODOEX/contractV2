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
        address tradePermissionManager
    ) external;

    //=========== admin ==========
    function setLpFeeRateModel(address newLpFeeRateModel) external;

    function setMtFeeRateModel(address newMtFeeRateModel) external;

    function setTradePermissionManager(address newTradePermissionManager) external;

    function setMaintainer(address newMaintainer) external;

    function setGasPriceSource(address newGasPriceLimitSource) external;

    function setISource(address newISource) external;

    function setKSource(address newKSource) external;

    function setBuy(bool open) external;

    function setSell(bool open) external;
   //============================== 

}
