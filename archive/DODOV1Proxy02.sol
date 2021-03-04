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
import {IChi} from "./intf/IChi.sol";
import {IUni} from "./intf/IUni.sol";
import {IDODOApprove} from "../intf/IDODOApprove.sol";
import {IDODOV1Proxy02} from "./intf/IDODOV1Proxy02.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";

/**
 * @title DODOV1Proxy02
 * @author DODO Breeder
 *
 * @notice Entrance of trading in DODO platform
 */
contract DODOV1Proxy02 is IDODOV1Proxy02, InitializableOwnable {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _DODO_APPROVE_;
    address public immutable _DODO_SELL_HELPER_;
    address public immutable _WETH_;
    address public immutable _CHI_TOKEN_;
    uint256 public _GAS_DODO_MAX_RETURN_ = 0;
    uint256 public _GAS_EXTERNAL_RETURN_ = 0;
    mapping (address => bool) public isWhiteListed;

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
        require(deadLine >= block.timestamp, "DODOV1Proxy02: EXPIRED");
        _;
    }

    constructor(
        address dodoApporve,
        address dodoSellHelper,
        address weth,
        address chiToken
    ) public {
        _DODO_APPROVE_ = dodoApporve;
        _DODO_SELL_HELPER_ = dodoSellHelper;
        _WETH_ = weth;
        _CHI_TOKEN_ = chiToken;
    }

    fallback() external payable {}

    receive() external payable {}

    function updateGasReturn(uint256 newDodoGasReturn, uint256 newExternalGasReturn) public onlyOwner {
        _GAS_DODO_MAX_RETURN_ = newDodoGasReturn;
        _GAS_EXTERNAL_RETURN_ = newExternalGasReturn;
    }

    function addWhiteList (address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = true;
    }

    function removeWhiteList (address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = false;
    }

    function dodoSwapV1(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        uint256 deadLine
    ) external override payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        require(dodoPairs.length > 0, "DODOV1Proxy02: PAIRS_EMPTY");
        require(minReturnAmount > 0, "DODOV1Proxy02: RETURN_AMOUNT_ZERO");
        require(fromToken != _CHI_TOKEN_, "DODOV1Proxy02: NOT_SUPPORT_SELL_CHI");
        uint256 originGas = gasleft();

        if (fromToken != _ETH_ADDRESS_) {
            IDODOApprove(_DODO_APPROVE_).claimTokens(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
        } else {
            require(msg.value == fromTokenAmount, "DODOV1Proxy02: ETH_AMOUNT_NOT_MATCH");
            IWETH(_WETH_).deposit{value: fromTokenAmount}();
        }

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            address curDodoPair = dodoPairs[i];
            if (directions & 1 == 0) {
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
            directions = directions >> 1;
        }

        if (toToken == _ETH_ADDRESS_) {
            returnAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(returnAmount);
        } else {
            returnAmount = IERC20(toToken).tokenBalanceOf(address(this));
        }
        
        require(returnAmount >= minReturnAmount, "DODOV1Proxy02: Return amount is not enough");
        IERC20(toToken).universalTransfer(msg.sender, returnAmount);
        
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
        
        uint256 _gasDodoMaxReturn = _GAS_DODO_MAX_RETURN_;
        if(_gasDodoMaxReturn > 0) {
            uint256 calcGasTokenBurn = originGas.sub(gasleft()) / 65000;
            uint256 gasTokenBurn = calcGasTokenBurn > _gasDodoMaxReturn ? _gasDodoMaxReturn : calcGasTokenBurn;
            if(gasleft() > 27710 + gasTokenBurn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(gasTokenBurn);
        }
    }

    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address swapTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        uint256 deadLine
    ) external override payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        require(minReturnAmount > 0, "DODOV1Proxy02: RETURN_AMOUNT_ZERO");
        require(fromToken != _CHI_TOKEN_, "DODOV1Proxy02: NOT_SUPPORT_SELL_CHI");
        
        address _fromToken = fromToken;
        address _toToken = toToken;
        
        uint256 toTokenOriginBalance = IERC20(_toToken).universalBalanceOf(msg.sender);

        if (_fromToken != _ETH_ADDRESS_) {
            IDODOApprove(_DODO_APPROVE_).claimTokens(
                _fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
            IERC20(_fromToken).universalApproveMax(approveTarget, fromTokenAmount);
        }

        require(isWhiteListed[swapTarget], "DODOV1Proxy02: Not Whitelist Contract");
        (bool success, ) = swapTarget.call{value: _fromToken == _ETH_ADDRESS_ ? msg.value : 0}(callDataConcat);

        require(success, "DODOV1Proxy02: External Swap execution Failed");

        IERC20(_toToken).universalTransfer(
            msg.sender,
            IERC20(_toToken).universalBalanceOf(address(this))
        );
        returnAmount = IERC20(_toToken).universalBalanceOf(msg.sender).sub(toTokenOriginBalance);
        require(returnAmount >= minReturnAmount, "DODOV1Proxy02: Return amount is not enough");

        emit OrderHistory(_fromToken, _toToken, msg.sender, fromTokenAmount, returnAmount);
        
        uint256 _gasExternalReturn = _GAS_EXTERNAL_RETURN_;
        if(_gasExternalReturn > 0) {
            if(gasleft() > 27710 + _gasExternalReturn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(_gasExternalReturn);
        }
    }


    function mixSwapV1(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory mixPairs,
        uint256[] memory directions,
        address[] memory portionPath,
        uint256 deadLine
    ) external override payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        require(mixPairs.length == directions.length, "DODOV1Proxy02: PARAMS_LENGTH_NOT_MATCH");
        require(mixPairs.length > 0, "DODOV1Proxy02: PAIRS_EMPTY");
        require(minReturnAmount > 0, "DODOV1Proxy02: RETURN_AMOUNT_ZERO");
        require(fromToken != _CHI_TOKEN_, "DODOV1Proxy02: NOT_SUPPORT_SELL_CHI");
        
        uint256 toTokenOriginBalance = IERC20(toToken).universalBalanceOf(msg.sender);

        if (fromToken != _ETH_ADDRESS_) {
            IDODOApprove(_DODO_APPROVE_).claimTokens(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
        } else {
            require(msg.value == fromTokenAmount, "DODOV1Proxy02: ETH_AMOUNT_NOT_MATCH");
            IWETH(_WETH_).deposit{value: fromTokenAmount}();
        }

        for (uint256 i = 0; i < mixPairs.length; i++) {
            address curPair = mixPairs[i];
            if (directions[i] == 0) {
                address curDodoBase = IDODOV1(curPair)._BASE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoBase).balanceOf(address(this));
                IERC20(curDodoBase).universalApproveMax(curPair, curAmountIn);
                IDODOV1(curPair).sellBaseToken(curAmountIn, 0, "");
            } else if(directions[i] == 1){
                address curDodoQuote = IDODOV1(curPair)._QUOTE_TOKEN_();
                uint256 curAmountIn = IERC20(curDodoQuote).balanceOf(address(this));
                IERC20(curDodoQuote).universalApproveMax(curPair, curAmountIn);
                uint256 canBuyBaseAmount = IDODOSellHelper(_DODO_SELL_HELPER_).querySellQuoteToken(
                    curPair,
                    curAmountIn
                );
                IDODOV1(curPair).buyBaseToken(canBuyBaseAmount, curAmountIn, "");
            } else {
                uint256 curAmountIn = IERC20(portionPath[0]).balanceOf(address(this));
                IERC20(portionPath[0]).universalApproveMax(curPair, curAmountIn);
                IUni(curPair).swapExactTokensForTokens(curAmountIn,0,portionPath,address(this),deadLine);
            }
        }

        IERC20(toToken).universalTransfer(
            msg.sender,
            IERC20(toToken).universalBalanceOf(address(this))
        );

        returnAmount = IERC20(toToken).universalBalanceOf(msg.sender).sub(toTokenOriginBalance);
        require(returnAmount >= minReturnAmount, "DODOV1Proxy02: Return amount is not enough");

        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
        
        uint256 _gasExternalReturn = _GAS_EXTERNAL_RETURN_;
        if(_gasExternalReturn > 0) {
            if(gasleft() > 27710 + _gasExternalReturn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(_gasExternalReturn);
        }
    }
}
