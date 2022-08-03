

/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;

import {IERC20} from "../../intf/IERC20.sol";
import {IWETH} from "../../intf/IWETH.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IDODOApproveProxy} from "../../intf/IDODOApproveProxy.sol";

contract ExternalSwapMock {
    using SafeERC20 for IERC20;

    address public _DODO_APPROVE_PROXY_;
    uint256 public _price;
    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function setDODOApproveProxy(address proxy) external {
        _DODO_APPROVE_PROXY_ = proxy;
    }

    function setPrice(uint256 price) external {
        _price = price;
    }

    function swap(address fromToken, address toToken, uint256 fromAmount) payable public {
        
        if(fromToken != _ETH_ADDRESS_) {
            IERC20(fromToken).transferFrom(msg.sender, address(this), fromAmount);
        } else {
            require(msg.value == fromAmount, "ETH_VALUE_WRONG");
        }
        
        uint256 toAmount = fromAmount * _price;
        IERC20(toToken).safeTransfer(msg.sender, toAmount);
    }
}