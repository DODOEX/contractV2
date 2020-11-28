/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDVM {
    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        address lpFeeRateModel,
        address mtFeeRateModel,
        address tradePermissionManager,
        address gasPriceSource,
        uint256 i,
        uint256 k
    ) external;

    function _BASE_TOKEN_() external returns (address);

    function _QUOTE_TOKEN_() external returns (address);

    function _LP_FEE_RATE_MODEL_() external returns (address);

    function _MT_FEE_RATE_MODEL_() external returns (address);

    function getVaultReserve() external returns (uint256 baseReserve, uint256 quoteReserve);

    function sellBase(address to) external returns (uint256);

    function sellQuote(address to) external returns (uint256);

    function buyShares(address to) external returns (uint256);

    //=========== admin ==========
    function setLpFeeRateModel(address newLpFeeRateModel) external;

    function setMtFeeRateModel(address newMtFeeRateModel) external;

    function setTradePermissionManager(address newTradePermissionManager) external;

    function setMaintainer(address newMaintainer) external;

    function setGasPriceSource(address newGasPriceLimitSource) external;

    function setBuy(bool open) external;

    function setSell(bool open) external;
    //==============================
}
