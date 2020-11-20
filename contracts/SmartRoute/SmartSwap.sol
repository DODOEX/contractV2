/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {Ownable} from "../lib/Ownable.sol";
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

    IERC20 constant ETH_ADDRESS = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    ISmartApprove public smartApprove;
    IDODOSellHelper public dodoSellHelper;
    address payable public _WETH_;


    modifier judgeExpired(uint256 deadline) {
        require(deadline >= block.timestamp, 'DODO SmartSwap: EXPIRED');
        _;
    }

    event OrderHistory(
        IERC20 indexed fromToken,
        IERC20 indexed toToken,
        address indexed sender,
        uint256 fromAmount,
        uint256 returnAmount,
        uint256 timeStamp
    );

    event ExternalRecord(address indexed to, address indexed sender);

    constructor(
        address _smartApprove,
        address _dodoSellHelper,
        address payable _weth
    ) public {
        smartApprove = ISmartApprove(_smartApprove);
        dodoSellHelper = IDODOSellHelper(_dodoSellHelper);
        _WETH_ = _weth;
    }

    fallback() external payable {}

    receive() external payable {}

    function dodoSwap(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256[] memory directions,
        uint256 deadline
    ) public payable judgeExpired(deadline) returns (uint256 returnAmount) {
        require(minReturnAmount > 0, "DODO SmartSwap: Min return should be bigger then 0.");
        require(dodoPairs.length > 0, "DODO SmartSwap: pairs should exists.");

        if (fromToken != ETH_ADDRESS) {
            smartApprove.claimTokens(fromToken, msg.sender, address(this),fromTokenAmount);
        } else {
            require(msg.value == fromTokenAmount, "DODO SmartSwap: ETH_AMOUNT_NOT_MATCH");
            IWETH(_WETH_).deposit{value: fromTokenAmount}();
        }

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            uint256 curDirection = directions[i];
            address curDodoPair = dodoPairs[i];
            if (curDirection == 0) {
                address curDodoBase = IDODO(curDodoPair)._BASE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoBase).balanceOf(address(this));
                IERC20(curDodoBase).universalApprove(curDodoPair, curAmountIn);
                IDODO(curDodoPair).sellBaseToken(curAmountIn, 0, "");
            } else {
                address curDodoQuote = IDODO(curDodoPair)._QUOTE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoQuote).balanceOf(address(this));
                IERC20(curDodoQuote).universalApprove(curDodoPair, curAmountIn);
                uint256 canBuyBaseAmount = dodoSellHelper.querySellQuoteToken(
                    curDodoPair,
                    curAmountIn
                );
                IDODO(curDodoPair).buyBaseToken(canBuyBaseAmount, curAmountIn, "");
            }
        }
        fromToken.universalTransfer(msg.sender, fromToken.universalBalanceOf(address(this)));

        if (toToken == ETH_ADDRESS) {
            uint256 wethAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(wethAmount);
        }

        returnAmount = toToken.universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, "DODO SmartSwap: Return amount is not enough");
        toToken.universalTransfer(msg.sender, returnAmount);
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount, block.timestamp);
    }

    function externalSwap(
        IERC20 fromToken,
        IERC20 toToken,
        address approveTarget,
        address to,
        uint256 gasSwap,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        uint256 deadline
    ) public payable judgeExpired(deadline) returns (uint256 returnAmount) {
        
        require(minReturnAmount > 0, "DODO SmartSwap: Min return should be bigger then 0.");

        if (fromToken != ETH_ADDRESS) {
            smartApprove.claimTokens(fromToken, msg.sender, address(this), fromTokenAmount);
            fromToken.universalApprove(approveTarget, fromTokenAmount);
        }

        (bool success, ) = to.call{value: fromToken == ETH_ADDRESS ? msg.value : 0, gas: gasSwap}(
            callDataConcat
        );

        require(success, "DODO SmartSwap: Contract Swap execution Failed");

        fromToken.universalTransfer(msg.sender, fromToken.universalBalanceOf(address(this)));
        returnAmount = toToken.universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, "DODO SmartSwap: Return amount is not enough");
        toToken.universalTransfer(msg.sender, returnAmount);
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount, block.timestamp);
        emit ExternalRecord(to, msg.sender);
    }
}
