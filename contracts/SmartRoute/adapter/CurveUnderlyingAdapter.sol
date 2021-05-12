/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOAdapter} from "../intf/IDODOAdapter.sol";
import {ICurve} from "../intf/ICurve.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

// for two tokens
contract CurveUnderlyingAdapter is IDODOAdapter {
    using SafeMath for uint;

    function _curveSwap(address to, address pool, bytes memory moreInfo) internal {
        (address fromToken, address toToken, int128 i, int128 j) = abi.decode(moreInfo, (address, address, int128, int128));
        require(fromToken == ICurve(pool).underlying_coins(i), 'CurveAdapter: WRONG_TOKEN');
        require(toToken == ICurve(pool).underlying_coins(j), 'CurveAdapter: WRONG_TOKEN');
        uint256 sellAmount = IERC20(fromToken).balanceOf(address(this));

        // approve
        IERC20(fromToken).approve(pool, sellAmount);
        // swap
        ICurve(pool).exchange_underlying(i, j, sellAmount, 0);
        if(to != address(this)) {
            SafeERC20.safeTransfer(IERC20(toToken), to, IERC20(toToken).balanceOf(address(this)));
        }
    }

    function sellBase(address to, address pool, bytes memory moreInfo) external override {
        _curveSwap(to, pool, moreInfo);
    }

    function sellQuote(address to, address pool, bytes memory moreInfo) external override {
        _curveSwap(to, pool, moreInfo);
    }
}