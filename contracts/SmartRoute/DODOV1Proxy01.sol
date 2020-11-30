/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IERC20} from "../intf/IERC20.sol";
import {UniversalERC20} from "./lib/UniversalERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {IDODOV1} from "./intf/IDODOV1.sol";
import {IDODOSellHelper} from "./helper/DODOSellHelper.sol";
import {IWETH} from "../intf/IWETH.sol";
import {IDODOApprove} from "../intf/IDODOApprove.sol";
import {IDODOV1Proxy01} from "./intf/IDODOV1Proxy01.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";

contract DODOV1Proxy01 is IDODOV1Proxy01, ReentrancyGuard {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public _DODO_APPROVE_;
    address public _DODO_SELL_HELPER_;
    address payable public _WETH_;

    // ============ Events ============

    event OrderHistory(
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 fromAmount,
        uint256 returnAmount
    );

    // ============ Modifiers ============

    modifier judgeExpired(uint256 deadLine) {
        require(deadLine >= block.timestamp, "DODOV1Proxy01: EXPIRED");
        _;
    }

    constructor(
        address dodoApporve,
        address dodoSellHelper,
        address payable weth
    ) public {
        _DODO_APPROVE_ = dodoApporve;
        _DODO_SELL_HELPER_ = dodoSellHelper;
        _WETH_ = weth;
    }

    fallback() external payable {}

    receive() external payable {}

    function dodoSwapV1(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadLine
    ) external virtual override payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        if (fromToken != _ETH_ADDRESS_) {
            IDODOApprove(_DODO_APPROVE_).claimTokens(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
        } else {
            require(msg.value == fromTokenAmount, "DODOV1Proxy01: ETH_AMOUNT_NOT_MATCH");
            IWETH(_WETH_).deposit{value: fromTokenAmount}();
        }

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            address curDodoPair = dodoPairs[i];
            if (directions[i] == 0) {
                address curDodoBase = IDODOV1(curDodoPair)._BASE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoBase).balanceOf(address(this));
                IERC20(curDodoBase).universalApproveMax(curDodoPair, curAmountIn);
                IDODOV1(curDodoPair).sellBaseToken(curAmountIn, 0, "");
            } else {
                address curDodoQuote = IDODOV1(curDodoPair)._QUOTE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoQuote).balanceOf(address(this));
                IERC20(curDodoQuote).universalApproveMax(curDodoPair, curAmountIn);
                uint256 canBuyBaseAmount = IDODOSellHelper(_DODO_SELL_HELPER_).querySellQuoteToken(
                    curDodoPair,
                    curAmountIn
                );
                IDODOV1(curDodoPair).buyBaseToken(canBuyBaseAmount, curAmountIn, "");
            }
        }

        if (toToken == _ETH_ADDRESS_) {
            returnAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(returnAmount);
        } else {
            returnAmount = IERC20(toToken).tokenBalanceOf(address(this));
        }
        
        require(returnAmount >= minReturnAmount, "DODOV1Proxy01: Return amount is not enough");
        IERC20(toToken).universalTransfer(msg.sender, returnAmount);

        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
    }

    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address to,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        uint256 deadLine
    ) external virtual override payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        uint256 toTokenOriginBalance = IERC20(toToken).universalBalanceOf(msg.sender);

        if (fromToken != _ETH_ADDRESS_) {
            IDODOApprove(_DODO_APPROVE_).claimTokens(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
            IERC20(fromToken).universalApproveMax(approveTarget, fromTokenAmount);
        }

        (bool success, ) = to.call{value: fromToken == _ETH_ADDRESS_ ? msg.value : 0}(callDataConcat);

        require(success, "DODOV1Proxy01: Contract Swap execution Failed");

        IERC20(fromToken).universalTransfer(
            msg.sender,
            IERC20(fromToken).universalBalanceOf(address(this))
        );

        IERC20(toToken).universalTransfer(
            msg.sender,
            IERC20(toToken).universalBalanceOf(address(this))
        );
        returnAmount = IERC20(toToken).universalBalanceOf(msg.sender).sub(toTokenOriginBalance);
        require(returnAmount >= minReturnAmount, "DODOV1Proxy01: Return amount is not enough");

        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
    }
}
