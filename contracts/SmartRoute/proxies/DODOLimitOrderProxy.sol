/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOApproveProxy} from "../DODOApproveProxy.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IWETH} from "../../intf/IWETH.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";

/**
 * @title DODOLimitOrderProxy
 * @author DODO Breeder
 *
 * @notice Proxy of DODO LimitOrder
 */
contract DODOLimitOrderProxy is ReentrancyGuard {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;
    mapping (address => bool) public isWhiteListed;

    // ============ Events ============

    event OrderHistory(
        address fromToken,
        address toToken,
        address sender,
        uint256 fromAmount,
        uint256 returnAmount
    );

    // ============ Modifiers ============

    modifier judgeExpired(uint256 deadLine) {
        require(deadLine >= block.timestamp, "DODOLimitOrderProxy: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor(
        address payable weth,
        address dodoApproveProxy
    ) public {
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }


    function fillLimitOrders(
        address fromToken,
        address toToken,
        address approveTarget,
        address fillOrderTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes[] memory fillOrderDatas,
        uint256 deadLine
    )
        external
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        require(minReturnAmount > 0, "DODOLimitOrderProxy: RETURN_AMOUNT_ZERO");
        
        uint256 toTokenOriginBalance = IERC20(toToken).universalBalanceOf(msg.sender);
        if (fromToken != _ETH_ADDRESS_) {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
            IERC20(fromToken).universalApproveMax(approveTarget, fromTokenAmount);
        }

        require(isWhiteListed[fillOrderTarget], "DODOLimitOrderProxy: Not Whitelist Contract");

        for(uint256 i = 0; i < fillOrderDatas.length; i++) {
            (bool success, ) = fillOrderTarget.call(fillOrderDatas[i]);
            require(success, "DODOLimitOrderProxy: Fill LimitOrder execution Failed");
        }

        IERC20(toToken).universalTransfer(
            msg.sender,
            IERC20(toToken).universalBalanceOf(address(this))
        );

        returnAmount = IERC20(toToken).universalBalanceOf(msg.sender).sub(toTokenOriginBalance);
        require(returnAmount >= minReturnAmount, "DODOLimitOrderProxy: Return amount is not enough");

        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount
        );
    }


    function _deposit(
        address from,
        address to,
        address token,
        uint256 amount,
        bool isETH
    ) internal {
        if (isETH) {
            if (amount > 0) {
                IWETH(_WETH_).deposit{value: amount}();
                if (to != address(this)) SafeERC20.safeTransfer(IERC20(_WETH_), to, amount);
            }
        } else {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(token, from, to, amount);
        }
    }
}
