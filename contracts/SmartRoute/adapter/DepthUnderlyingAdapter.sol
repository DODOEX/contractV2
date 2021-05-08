/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOAdapter} from "../intf/IDODOAdapter.sol";
import {IDepth} from "../intf/IDepth.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

// for two tokens
contract DepthUnderlyingAdapter is IDODOAdapter {
    using SafeMath for uint;

    //fromToken == token[0], underlying
    function sellBase(address to, address pool, bytes memory moreInfo) external override {
        (address fromToken, address toToken, int128 i, int128 j) = abi.decode(moreInfo, (address, address, int128, int128));
        require(fromToken == IDepth(pool).underlying_coins(i), 'DepthAdapter: WRONG_TOKEN');
        require(toToken == IDepth(pool).underlying_coins(j), 'DepthAdapter: WRONG_TOKEN');
        uint256 sellBaseAmount = IERC20(fromToken).balanceOf(address(this));

        // approve
        IERC20(fromToken).approve(pool, sellBaseAmount);
        // swap
        IDepth(pool).exchange_underlying(i, j, sellBaseAmount, 0);
        if(to != address(this)) {
            SafeERC20.safeTransfer(IERC20(toToken), to, IERC20(toToken).balanceOf(address(this)));
        }
    }

    //fromToken == token[1], underlying
    function sellQuote(address to, address pool, bytes memory moreInfo) external override {
        (address fromToken, address toToken, int128 i, int128 j) = abi.decode(moreInfo, (address, address, int128, int128));
        require(fromToken == IDepth(pool).underlying_coins(i), 'DepthAdapter: WRONG_TOKEN');
        require(toToken == IDepth(pool).underlying_coins(j), 'DepthAdapter: WRONG_TOKEN');
        uint256 sellQuoteAmount = IERC20(toToken).balanceOf(address(this));

        // approve
        IERC20(toToken).approve(pool, sellQuoteAmount);
        // swap
        IDepth(pool).exchange_underlying(i, j, sellQuoteAmount, 0);
        if(to != address(this)) {
            SafeERC20.safeTransfer(IERC20(fromToken), to, IERC20(fromToken).balanceOf(address(this)));
        }
    }
}