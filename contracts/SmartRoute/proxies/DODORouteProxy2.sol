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
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IDODOAdapter} from "../intf/IDODOAdapter.sol";

contract DODORouteProxy is ReentrancyGuard, InitializableOwnable {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;

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
        require(deadLine >= block.timestamp, "DODORouteProxy: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor (
        address payable weth,
        address dodoApproveProxy
    ) public {
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }

    function dodoMutliSwap(
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        uint256[] memory totalWeight,
        uint256[] memory splitNumber,
        address[] memory midToken,
        address[] memory assetFrom,
        bytes[] memory sequence,
        uint256 deadLine
    ) external payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        require(assetFrom.length == splitNumber.length, 'DODORouteProxy: PAIR_ASSETTO_NOT_MATCH');        
        require(minReturnAmount > 0, "DODORouteProxy: RETURN_AMOUNT_ZERO");
        
        uint256 _fromTokenAmount = fromTokenAmount;
        address fromToken = midToken[0];
        address toToken = midToken[midToken.length - 1];

        uint256 toTokenOriginBalance = IERC20(toToken).universalBalanceOf(msg.sender);
        _deposit(msg.sender, assetFrom[0], fromToken, _fromTokenAmount, fromToken == _ETH_ADDRESS_);

        _multiSwap(totalWeight, midToken, splitNumber, sequence, assetFrom);
    
        if(toToken == _ETH_ADDRESS_) {
            returnAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(returnAmount);
            msg.sender.transfer(returnAmount);
        }else {
            returnAmount = IERC20(toToken).tokenBalanceOf(msg.sender).sub(toTokenOriginBalance);
        }

        require(returnAmount >= minReturnAmount, "DODORouteProxy: Return amount is not enough");
    
        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            _fromTokenAmount,
            returnAmount
        );    
    }

    
    //====================== internal =======================

    function _multiSwap(
        uint256[] memory totalWeight,
        address[] memory midToken,
        uint256[] memory splitNumber,
        bytes[] memory swapSequence,
        address[] memory assetFrom
    ) internal { 
        for(uint256 i = 1; i < splitNumber.length; i++) { 
        
            uint256 curTotalAmount = IERC20(midToken[i]).tokenBalanceOf(assetFrom[i-1]);
            uint256 curTotalWeight = totalWeight[i-1];
            
            for(uint256 j = splitNumber[i-1]; j < splitNumber[i]; j++) {
                //uint256 tmpNumber = splitNumber[i] - splitNumber[i-1] + j;
                (address pool, address adapter, uint256 direction, uint256 weight) = abi.decode(swapSequence[j], (address, address, uint256, uint256));

                if(assetFrom[i-1] == address(this)) {
                    uint256 curAmount = curTotalAmount.div(curTotalWeight).mul(weight);
                    
                    IERC20(midToken[i]).transfer(pool, curAmount);
                }

                if(direction == 0) {
                    IDODOAdapter(adapter).sellBase(assetFrom[i], pool);
                } else {
                    IDODOAdapter(adapter).sellQuote(assetFrom[i], pool);
                }
            }
        }
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