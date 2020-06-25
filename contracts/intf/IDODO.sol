/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;


interface IDODO {
    function init(
        address supervisor,
        address maintainer,
        address baseToken,
        address quoteToken,
        address oracle,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 k,
        uint256 gasPriceLimit
    ) external;

    function transferOwnership(address newOwner) external;

    function sellBaseToken(uint256 amount, uint256 minReceiveQuote) external returns (uint256);

    function buyBaseToken(uint256 amount, uint256 maxPayQuote) external returns (uint256);

    function querySellBaseToken(uint256 amount) external view returns (uint256 receiveQuote);

    function queryBuyBaseToken(uint256 amount) external view returns (uint256 payQuote);

    function depositBaseTo(address to, uint256 amount) external;

    function withdrawBase(uint256 amount) external returns (uint256);

    function withdrawAllBase() external returns (uint256);

    function depositQuoteTo(address to, uint256 amount) external;

    function withdrawQuote(uint256 amount) external returns (uint256);

    function withdrawAllQuote() external returns (uint256);
}
