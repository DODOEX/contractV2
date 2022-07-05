/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOApproveProxy} from "../DODOApproveProxy.sol";
import {IERC20} from "../intf/IERC20.sol";
import {IWETH} from "../intf/IWETH.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {UniversalERC20} from "../SmartRoute/lib/UniversalERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {IDODOAdapter} from "../SmartRoute/intf/IDODOAdapter.sol";
import {IFeeManager} from "../SmartRoute/intf/IFeeManager.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";


/**
 * @title DODORouteProxy
 * @author DODO Breeder
 *
 * @notice Entrance of Split trading in DODO platform
 */
contract DODORouteProxy is InitializableOwnable{
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;
    address public _FEE_MANAGER_;
    mapping (address => bool) public isWhiteListed;

    struct PoolInfo {
        uint256 direction;
        uint256 poolEdition;
        uint256 weight;
        address pool;
        address adapter;
        bytes moreInfo;
    }
    
    struct FeeInfo {
        address rebateTo;
        uint8 fee;
        uint256 feeAmount;
    }

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
        address dodoApproveProxy,
        address feeManager
    ) public {
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
        _FEE_MANAGER_ = feeManager;
    }

    function setNewFeeManager(address _feeManager) external onlyOwner {
        _FEE_MANAGER_ = _feeManager;
    }

    function addWhiteList (address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = true;
    }

    function removeWhiteList (address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = false;
    }

    // ============ Swap ============

    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address swapTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        bytes memory feeData,
        uint256 deadLine
    )
        external
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        require(minReturnAmount > 0, "DODORouteProxy: RETURN_AMOUNT_ZERO");
        
        uint256 _fromTokenAmount = fromTokenAmount;
        {
            
            address _fromToken = fromToken;
            FeeInfo memory feeInfo;
            {
                (address _rebateTo, uint8 _fee) = abi.decode(feeData, (address, uint8));
                feeInfo.fee = _fee;
                feeInfo.rebateTo = _rebateTo;
            }
            if(feeInfo.fee > 0) {
                require(feeInfo.fee < 10000, "DODORouteProxy: fee overflow");
                feeInfo.feeAmount = _fromTokenAmount.mul(feeInfo.fee).div(10000);
                _fromTokenAmount -= feeInfo.feeAmount;
                _deposit(msg.sender, _FEE_MANAGER_, _fromToken, feeInfo.feeAmount, _fromToken == _ETH_ADDRESS_);
                IFeeManager(_FEE_MANAGER_).rebate(feeInfo.rebateTo, feeInfo.feeAmount, _fromToken);
            }
        
        
            if (_fromToken != _ETH_ADDRESS_) {
                IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(
                    _fromToken,
                    msg.sender,
                    address(this),
                    _fromTokenAmount
                );
                IERC20(_fromToken).universalApproveMax(approveTarget, _fromTokenAmount);
            }
        }

        uint256 toTokenOriginBalance = IERC20(toToken).universalBalanceOf(msg.sender);
        {
        require(isWhiteListed[swapTarget], "DODORouteProxy: Not Whitelist Contract");
        (bool success, ) = swapTarget.call{value: fromToken == _ETH_ADDRESS_ ? _fromTokenAmount : 0}(callDataConcat);

        require(success, "DODORouteProxy: External Swap execution Failed");
        }

        IERC20(toToken).universalTransfer(
            msg.sender,
            IERC20(toToken).universalBalanceOf(address(this))
        );

        returnAmount = IERC20(toToken).universalBalanceOf(msg.sender).sub(toTokenOriginBalance);
        require(returnAmount >= minReturnAmount, "DODORouteProxy: Return amount is not enough");

        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount
        );
    }


    function mixSwap(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory mixAdapters,
        address[] memory mixPairs,
        address[] memory assetTo,
        uint256 directions,
        bytes[] memory moreInfos,
        bytes memory feeData,
        uint256 deadLine
    ) external payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        require(mixPairs.length > 0, "DODORouteProxy: PAIRS_EMPTY");
        require(mixPairs.length == mixAdapters.length, "DODORouteProxy: PAIR_ADAPTER_NOT_MATCH");
        require(mixPairs.length == assetTo.length - 1, "DODORouteProxy: PAIR_ASSETTO_NOT_MATCH");
        require(minReturnAmount > 0, "DODORouteProxy: RETURN_AMOUNT_ZERO");

        {
        uint256 _fromTokenAmount = fromTokenAmount;
        address _fromToken = fromToken;
        
        {
            FeeInfo memory feeInfo;
            {
                (address _rebateTo, uint8 _fee) = abi.decode(feeData, (address, uint8));
                feeInfo.fee = _fee;
                feeInfo.rebateTo = _rebateTo;
            }
            if(feeInfo.fee > 0) {
                require(feeInfo.fee < 10000, "DODORouteProxy: fee overflow");
                feeInfo.feeAmount = _fromTokenAmount.mul(feeInfo.fee).div(10000);
                _fromTokenAmount -= feeInfo.feeAmount;
                _deposit(msg.sender, _FEE_MANAGER_, _fromToken, feeInfo.feeAmount, _fromToken == _ETH_ADDRESS_);
                IFeeManager(_FEE_MANAGER_).rebate(feeInfo.rebateTo, feeInfo.feeAmount, _fromToken);
            }
        }

        
        address _toToken = toToken;
        
        uint256 toTokenOriginBalance = IERC20(_toToken).universalBalanceOf(msg.sender);
        
        _deposit(msg.sender, assetTo[0], _fromToken, _fromTokenAmount, _fromToken == _ETH_ADDRESS_);

        for (uint256 i = 0; i < mixPairs.length; i++) {
            if (directions & 1 == 0) {
                IDODOAdapter(mixAdapters[i]).sellBase(assetTo[i + 1],mixPairs[i], moreInfos[i]);
            } else {
                IDODOAdapter(mixAdapters[i]).sellQuote(assetTo[i + 1],mixPairs[i], moreInfos[i]);
            }
            directions = directions >> 1;
        }

        if(_toToken == _ETH_ADDRESS_) {
            returnAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(returnAmount);
            msg.sender.transfer(returnAmount);
        }else {
            returnAmount = IERC20(_toToken).tokenBalanceOf(msg.sender).sub(toTokenOriginBalance);
        }

        require(returnAmount >= minReturnAmount, "DODORouteProxy: Return amount is not enough");
        }

        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount
        );
    }

    function dodoMutliSwap(
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        uint256[] memory totalWeight,
        uint256[] memory splitNumber,
        address[] memory midToken,
        address[] memory assetFrom,
        bytes[] memory sequence,
        bytes memory feeData,
        uint256 deadLine
    ) external payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        {
        require(assetFrom.length == splitNumber.length, 'DODORouteProxy: PAIR_ASSETTO_NOT_MATCH');        
        require(minReturnAmount > 0, "DODORouteProxy: RETURN_AMOUNT_ZERO");
        uint256 _fromTokenAmount = fromTokenAmount;
        
        {
            FeeInfo memory feeInfo;
            {
                (address _rebateTo, uint8 _fee) = abi.decode(feeData, (address, uint8));
                feeInfo.fee = _fee;
                feeInfo.rebateTo = _rebateTo;
            }
            if(feeInfo.fee > 0) {
                require(feeInfo.fee < 10000, "DODORouteProxy: fee overflow");
                feeInfo.feeAmount = _fromTokenAmount.mul(feeInfo.fee).div(10000);
                _fromTokenAmount -= feeInfo.feeAmount;
                _deposit(msg.sender, _FEE_MANAGER_, midToken[0], feeInfo.feeAmount, midToken[0] == _ETH_ADDRESS_);
                IFeeManager(_FEE_MANAGER_).rebate(feeInfo.rebateTo, feeInfo.feeAmount, midToken[0]);
            }
        }
        
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
        }
    
        emit OrderHistory(
            midToken[0], //fromToken
            midToken[midToken.length - 1], //toToken
            msg.sender,
            fromTokenAmount,
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
            // define midtoken address, ETH -> WETH address
            uint256 curTotalAmount = IERC20(midToken[i]).tokenBalanceOf(assetFrom[i-1]);
            uint256 curTotalWeight = totalWeight[i-1];
            
            for(uint256 j = splitNumber[i-1]; j < splitNumber[i]; j++) {
                PoolInfo memory curPoolInfo;
                {
                    (address pool, address adapter, uint256 mixPara, bytes memory moreInfo) = abi.decode(swapSequence[j], (address, address, uint256, bytes));
                
                    curPoolInfo.direction = mixPara >> 17;
                    curPoolInfo.weight = (0xffff & mixPara) >> 9;
                    curPoolInfo.poolEdition = (0xff & mixPara);
                    curPoolInfo.pool = pool;
                    curPoolInfo.adapter = adapter;
                    curPoolInfo.moreInfo = moreInfo;
                }

                if(assetFrom[i-1] == address(this)) {
                    uint256 curAmount = curTotalAmount.mul(curPoolInfo.weight).div(curTotalWeight);
            
                    if(curPoolInfo.poolEdition == 1) {   
                        //For using transferFrom pool (like dodoV1, Curve)
                        IERC20(midToken[i]).transfer(curPoolInfo.adapter, curAmount);
                    } else {
                        //For using transfer pool (like dodoV2)
                        IERC20(midToken[i]).transfer(curPoolInfo.pool, curAmount);
                    }
                }
                
                if(curPoolInfo.direction == 0) {
                    IDODOAdapter(curPoolInfo.adapter).sellBase(assetFrom[i], curPoolInfo.pool, curPoolInfo.moreInfo);
                } else {
                    IDODOAdapter(curPoolInfo.adapter).sellQuote(assetFrom[i], curPoolInfo.pool, curPoolInfo.moreInfo);
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
                //require(msg.value == amount, "ETH_VALUE_WRONG");
                IWETH(_WETH_).deposit{value: amount}();
                if (to != address(this)) SafeERC20.safeTransfer(IERC20(_WETH_), to, amount);
            }
        } else {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(token, from, to, amount);
        }
    }
}