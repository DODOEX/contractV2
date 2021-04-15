/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOAdapter} from "../intf/IDODOAdapter.sol";
import {IDepth} from "../intf/IDepth.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";

contract DepthUnderlyingAdapter is IDODOAdapter {
    using SafeMath for uint;

    //fromToken == token[0], underlying
    function sellBase(address to, address pool) external override {
        address baseToken = IDepth(pool).underlying_coins(0);
        uint256 sellBaseAmount = IERC20(baseToken).balanceOf(address(this));

        // approve
        IERC20(baseToken).approve(pool, sellBaseAmount);
        // swap
        IDepth(pool).exchange_underlying(0, 1, sellBaseAmount, 0);
        if(to != address(this)) {
            address curQuote = IDepth(pool).underlying_coins(1);
            SafeERC20.safeTransfer(IERC20(curQuote), to, IERC20(curQuote).tokenBalanceOf(address(this)));
        }
    }

    //fromToken == token[1], underlying
    function sellQuote(address to, address pool) external override {
        address quoteToken = IDepth(pool).underlying_coins(1);
        uint256 sellQuoteAmount = IERC20(quoteToken).balanceOf(address(this));

        // approve
        IERC20(quoteToken).approve(pool, sellQuoteAmount);
        // swap
        IDepth(pool).exchange_underlying(1, 0, sellQuoteAmount, 0);
        if(to != address(this)) {
            address curBase = IDepth(pool).underlying_coins(0);
            SafeERC20.safeTransfer(IERC20(curBase), to, IERC20(curBase).tokenBalanceOf(address(this)));
        }
    }
}