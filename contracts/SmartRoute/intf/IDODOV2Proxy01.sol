/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOV1Proxy01} from "./IDODOV1Proxy01.sol";

interface IDODOV2Proxy01 is IDODOV1Proxy01 {
    function dodoSwapV2ETHToToken(
        address payable assetTo,
        address toToken,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        uint256 deadLine
    ) external payable returns (uint256 returnAmount);

    function dodoSwapV2TokenToETH(
        address payable assetTo,
        address fromToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        uint256 deadLine
    ) external returns (uint256 returnAmount);

    function dodoSwapV2TokenToToken(
        address payable assetTo,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        uint256 deadLine
    ) external returns (uint256 returnAmount);

    function createDODOVendingMachine(
        address assetTo,
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadLine
    ) external payable returns (address newVendingMachine, uint256 shares);

    function addDVMLiquidity(
        address dvmAddress,
        address to,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint8 flag, //  0 - ERC20, 1 - baseInETH, 2 - quoteInETH
        uint256 deadLine
    )
        external
        payable
        returns (
            uint256 shares,
            uint256 baseAdjustedInAmount,
            uint256 quoteAdjustedInAmount
        );

    function createDODOPrivatePool(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadLine
    ) external payable returns (address newPrivatePool);

    function resetDODOPrivatePool(
        address dppAddress,
        uint256[] memory paramList,  //0 - newLpFeeRate, 1 - newMtFeeRate, 2 - newI, 3 - newK
        uint256[] memory amountList, //0 - baseInAmount, 1 - quoteInAmount, 2 - baseOutAmount, 3 - quoteOutAmount
        uint8 flag, // 0 - ERC20, 1 - baseInETH, 2 - quoteInETH, 3 - baseOutETH, 4 - quoteOutETH
        uint256 minBaseReserve,
        uint256 minQuoteReserve,
        uint256 deadLine
    ) external payable;

    function createCrowdPooling(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256[] memory timeLine,
        uint256[] memory valueList,
        uint256 deadLine
    ) external payable returns (address payable newCrowdPooling);

    function bid(
        address assetTo,
        address cpAddress,
        uint256 quoteAmount,
        uint8 flag, // 0 - ERC20, 1 - quoteInETH
        uint256 deadLine
    ) external payable;

    function addLiquidityToV1(
        address to,
        address pair,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 baseMinShares,
        uint256 quoteMinShares,
        uint8 flag, // 0 erc20 Out  1 baseOutETH  2 quoteOut ETH 
        uint256 deadLine
    ) external payable returns(uint256, uint256);

}
