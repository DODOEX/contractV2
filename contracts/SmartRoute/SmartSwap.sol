/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {Ownable} from "../lib/Ownable.sol";
import {ExternalCall} from "../lib/ExternalCall.sol";
import {IERC20} from "../intf/IERC20.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {IDODOSellHelper} from "../intf/IDODOSellHelper.sol";
import {ISmartApprove} from "../intf/ISmartApprove.sol";
import {IDODO} from "../intf/IDODO.sol";
import {IWETH} from "../intf/IWETH.sol";


contract SmartSwap is Ownable {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;
    using ExternalCall for address;

    IERC20 constant ETH_ADDRESS = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    ISmartApprove public smartApprove;
    IDODOSellHelper public dodoSellHelper;
    address payable public _WETH_;

    event OrderHistory(
        IERC20 indexed fromToken,
        IERC20 indexed toToken,
        address indexed sender,
        uint256 fromAmount,
        uint256 returnAmount
    );

    event ExternalRecord(address indexed to, address indexed sender);

    constructor(address _smartApprove,address _dodoSellHelper,address payable _weth) public {
        smartApprove = ISmartApprove(_smartApprove);
        dodoSellHelper = IDODOSellHelper(_dodoSellHelper);
        _WETH_ = _weth;
    }


    fallback() external payable {
        require(msg.sender == _WETH_, "WE_CAN_NOT_SAVED_YOUR_ETH");
    }

    function dodoSwap(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256[] memory directions
    ) public payable returns (uint256 returnAmount) {
        require(minReturnAmount > 0, "Min return should be bigger then 0.");
        require(dodoPairs.length > 0, "pairs should exists.");

        if (fromToken != ETH_ADDRESS) {
            smartApprove.claimTokens(fromToken, msg.sender, address(this), fromTokenAmount);
        } else {
            require(msg.value == fromTokenAmount, "ETH_AMOUNT_NOT_MATCH");
            IWETH(_WETH_).deposit{value: fromTokenAmount}();
        }

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            uint256 curDirection = directions[i];
            address curDodoPair = dodoPairs[i];
            if(curDirection == 0){
                address curDodoBase = IDODO(curDodoPair)._BASE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoBase).balanceOf(address(this));
                IERC20(curDodoBase).approve(curDodoPair,curAmountIn);
                IDODO(curDodoPair).sellBaseToken(curAmountIn, 0, "");
            }else {
                address curDodoQuote = IDODO(curDodoPair)._QUOTE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoQuote).balanceOf(address(this));
                IERC20(curDodoQuote).approve(curDodoPair,curAmountIn);
                uint256 canBuyBaseAmount = dodoSellHelper.querySellQuoteToken(curDodoPair,curAmountIn);
                IDODO(curDodoPair).buyBaseToken(canBuyBaseAmount, curAmountIn, "");
            }
        }
        fromToken.universalTransfer(msg.sender, fromToken.universalBalanceOf(address(this)));

        if (toToken == ETH_ADDRESS) {
            uint256 wethAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(wethAmount);
        }

        returnAmount = toToken.universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, "Return amount is not enough");
        toToken.universalTransfer(msg.sender, returnAmount);
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
    }


    function externalSwap(
        IERC20 fromToken,
        IERC20 toToken,
        address approveTarget,
        address to,
        uint256 gasSwap,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat
    ) public payable returns (uint256 returnAmount) {
        
        require(minReturnAmount > 0, "Min return should be bigger then 0.");

        if (fromToken != ETH_ADDRESS) {
            smartApprove.claimTokens(fromToken, msg.sender, address(this), fromTokenAmount);
            fromToken.approve(approveTarget, fromTokenAmount);
        }

        (bool success, ) = to.call{value: msg.value, gas: gasSwap}(callDataConcat);

        require(success, "Contract Swap execution Failed");

        fromToken.universalTransfer(msg.sender, fromToken.universalBalanceOf(address(this)));
        returnAmount = toToken.universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, "Return amount is not enough");
        toToken.universalTransfer(msg.sender, returnAmount);
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
        emit ExternalRecord(to, msg.sender);
    }
}
