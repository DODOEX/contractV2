/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "./IERC20.sol";

interface IDODOV2Proxy01 {
	function dodoSwap(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256[] memory directions,
        uint256 deadline
    ) external payable returns (uint256 returnAmount);

    
    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address to,
        uint256 gasSwap,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        uint256 deadline
    ) external payable returns (uint256 returnAmount);

    
    function createDODOVendingMachine(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadline
    ) external payable returns (address newVendingMachine,uint256 shares);

   
    function addDVMLiquidity(
    	address DVMAddress,
        address to,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint256 deadline
    ) external payable returns (uint256 shares,uint256 baseActualInAmount,uint256 quoteActualInAmount);

    
    function removeDVMLiquidity(
    	address DVMAddress,
        address to,
        uint256 shares,
        uint256 baseOutMinAmount,
        uint256 quoteOutMinAmount,
        uint256 deadline
    ) external payable returns (uint256 baseOutAmount,uint256 quoteOutAmount);


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
        uint256 deadline
    ) external;


    function resetDODOPrivatePoolETH(
        address DPPAddress,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint8 flag,  // 1 - baseInETH, 2 - quoteInETH, 3 - baseOutETH, 4 - quoteOutETH
        uint256 deadline
    ) external payable;

    //TODO: addLiquidityToClassical

    //TODO: removeLiquidityToClassical

}
