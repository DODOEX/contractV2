/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDODOV2Proxy01 {
    function dodoSwapETHToToken(
        address payable assetTo,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadline
    ) external payable returns (uint256 returnAmount);

    function dodoSwapTokenToETH(
        address payable assetTo,
        address fromToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadline
    ) external returns (uint256 returnAmount);

    function dodoSwapTokenToToken(
        address payable assetTo,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadline
    ) external returns (uint256 returnAmount);

    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address to,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        uint256 deadline
    ) external payable returns (uint256 returnAmount);

    function createDODOVendingMachine(
        address assetTo,
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadline
    ) external payable returns (address newVendingMachine, uint256 shares);

    function addDVMLiquidity(
        address DVMAddress,
        address to,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint8 flag, //  0 - ERC20, 1 - baseInETH, 2 - quoteInETH
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 shares,
            uint256 baseAdjustedInAmount,
            uint256 quoteAdjustedInAmount
        );

    function removeDVMLiquidity(
        address DVMAddress,
        address payable to,
        uint256 sharesAmount,
        uint256 baseMinOutAmount,
        uint256 quoteMinOutAmount,
        uint8 flag, // 0 -ERC20, 1 - baseOutETH, 2 - quoteOutETH
        uint256 deadline
    ) external returns (uint256 baseOutAmount, uint256 quoteOutAmount);

    // ====================  Permit ================================
    function removeDVMLiquidityWithPermit(
        address DVMAddress,
        address payable to,
        uint256 sharesAmount,
        uint256 baseMinOutAmount,
        uint256 quoteMinOutAmount,
        uint8 flag, // 0 -ERC20, 1 - baseOutETH, 2 - quoteOutETH
        uint256 deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint256 baseOutAmount, uint256 quoteOutAmount);
    // ==============================================================


    function createDODOPrivatePool(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadline
    ) external payable returns (address newPrivatePool);

    function resetDODOPrivatePool(
        address DPPAddress,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint8 flag, // 0 - ERC20, 1 - baseInETH, 2 - quoteInETH, 3 - baseOutETH, 4 - quoteOutETH
        uint256 deadline
    ) external payable;

    //TODO: addLiquidityToClassical

    //TODO: removeLiquidityToClassical

    //TODO: Compatible with classical swap
}
