/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "./IERC20.sol";

interface IDODOV2 {

    //========== Common ==================

    function sellBase(address to) external returns (uint256 receiveQuoteAmount);

    function sellQuote(address to) external returns (uint256 receiveBaseAmount);

    function getVaultReserve() external view returns (uint256 baseReserve, uint256 quoteReserve);

    function _BASE_TOKEN_() external returns (address);

    function _QUOTE_TOKEN_() external returns (address);

    function getOwner() external view returns (address);

    //========== DODOVendingMachine ========
    
    function createDODOVendingMachine(
        address from,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k
    ) external returns (address newVendingMachine);

    function buyShares(address to) external returns (uint256,uint256,uint256);

    function sellShares(address to, uint256 amount, bytes calldata data) external returns (uint256,uint256);

    //========== DODOPrivatePool ===========

    function createDODOPrivatePool() external returns (address newPrivatePool);

    function initDODOPrivatePool(
        address dppAddress,
        address from,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 k,
        uint256 i
    ) external;

    function reset(
        address assetTo,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount
    ) external; 

    function resetETH(
        address from,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount
    ) external; 

    //========== DODOSellHelper ============

    function querySellQuoteToken(address pair, uint256 quoteInAmount) external view returns (uint256 expectedReceiveBaseAmount);
    
    function querySellBaseToken(address pair, uint256 baseInAmount) external view returns (uint256 expectedReceiveQuoteAmount);

    //========== SmartApprove  =============

    function claimTokens(address token,address who,address dest,uint256 amount) external;
    
    function getSmartSwap() external view returns (address);

}