/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IERC20} from "../../intf/IERC20.sol";
import {IWooPP} from "../intf/IWooPP.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {IDODOAdapter} from "../intf/IDODOAdapter.sol";

contract WooAdapter is IDODOAdapter {
    using UniversalERC20 for IERC20;
    
    function sellBase(address to, address pool, bytes memory moreInfo) external override {
        (address fromToken, address toToken, address rebateTo) = abi.decode(moreInfo, (address, address, address));
        uint256 curAmountIn = IERC20(fromToken).tokenBalanceOf(address(this));
        IERC20(fromToken).universalApproveMax(pool, curAmountIn);
        IWooPP(pool).sellBase(fromToken, curAmountIn, 0, to, rebateTo);
    }

    function sellQuote(address to, address pool, bytes memory moreInfo) external override {
        (address fromToken, address toToken, address rebateTo) = abi.decode(moreInfo, (address, address, address));
        uint256 curAmountIn = IERC20(fromToken).tokenBalanceOf(address(this));
        IERC20(fromToken).universalApproveMax(pool, curAmountIn);
        IWooPP(pool).sellQuote(toToken, curAmountIn, 0, to, rebateTo);
    }
}