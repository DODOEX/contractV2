/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOV2Proxy01} from "../intf/IDODOV2Proxy01.sol";
import {IDODOV2} from "../intf/IDODOV2.sol";
import {IERC20} from "../intf/IERC20.sol";
import {IWETH} from "../intf/IWETH.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";

contract DODOV2Proxy01 is IDODOV2Proxy01 {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    address constant ETH_ADDRESS = 0x000000000000000000000000000000000000000E;
    address payable public _WETH_;
    address public dodoApprove;
    address public dodoSellHelper;
    address public dvmFactory;
    address public dppFactory;

    modifier judgeExpired(uint256 deadline) {
        require(deadline >= block.timestamp, 'DODOV2Proxy01: EXPIRED');
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    //============================== events ==================================
    event OrderHistory(
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 fromAmount,
        uint256 returnAmount,
        uint256 timeStamp
    );
    //========================================================================

    constructor(
        address _dvmFactory,
        address _dppFactory,
        address payable _weth,
        address _dodoApprove,
        address _dodoSellHelper
    ) public {
        dvmFactory = _dvmFactory;
        dppFactory = _dppFactory;
        _WETH_ = _weth;
        dodoApprove = _dodoApprove;
        dodoSellHelper = _dodoSellHelper;
    }
    
    function createDODOVendingMachine(
        address assetTo,
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (address newVendingMachine,uint256 shares) {
        {
        address _baseToken = baseToken == ETH_ADDRESS ? _WETH_ : baseToken;
        address _quoteToken = quoteToken == ETH_ADDRESS ? _WETH_ : quoteToken;
        newVendingMachine = IDODOV2(dvmFactory).createDODOVendingMachine(msg.sender, _baseToken, _quoteToken, lpFeeRate, mtFeeRate, i, k);
        }
        if(baseInAmount > 0){
            if(baseToken != ETH_ADDRESS){
                IDODOV2(dodoApprove).claimTokens(baseToken, msg.sender, newVendingMachine, baseInAmount);
            }else {
                require(msg.value == baseInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: baseInAmount}();
                assert(IWETH(_WETH_).transfer(newVendingMachine, baseInAmount));
            }
        }
        if(quoteInAmount > 0){
            if(quoteToken != ETH_ADDRESS){
                IDODOV2(dodoApprove).claimTokens(quoteToken, msg.sender, newVendingMachine, quoteInAmount);
            }else {
                require(msg.value == quoteInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: quoteInAmount}();
                assert(IWETH(_WETH_).transfer(newVendingMachine, quoteInAmount));
            }
        }
        (shares,,) = IDODOV2(newVendingMachine).buyShares(assetTo);
    }


    function _addDVMLiquidity(
        address DVMAddress,
        uint256 baseInAmount,
        uint256 quoteInAmount
    ) internal virtual view returns (uint baseAdjustedInAmount, uint quoteAdjustedInAmount) {
        (uint256 baseReserve, uint256 quoteReserve) = IDODOV2(DVMAddress).getVaultReserve();
        if (quoteReserve == 0 && baseReserve == 0) {
            baseAdjustedInAmount = baseInAmount;
            quoteAdjustedInAmount = quoteInAmount;
        }
        if (quoteReserve == 0 && baseReserve > 0) {
            baseAdjustedInAmount = baseInAmount;
            quoteAdjustedInAmount = 0;
        }
        if (quoteReserve > 0 && baseReserve > 0) {
            uint256 baseIncreaseRatio = DecimalMath.divFloor(baseInAmount, baseReserve);
            uint256 quoteIncreaseRatio = DecimalMath.divFloor(quoteInAmount, quoteReserve);
            if (baseIncreaseRatio <= quoteIncreaseRatio) {
                baseAdjustedInAmount = baseInAmount;
                quoteAdjustedInAmount = DecimalMath.mulFloor(quoteReserve, baseIncreaseRatio);
            } else {
                quoteAdjustedInAmount = quoteInAmount;
                baseAdjustedInAmount = DecimalMath.mulFloor(baseReserve, quoteIncreaseRatio);
            }
        }
    }

    function addDVMLiquidity(
        address DVMAddress,
        address to,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint256 deadline
    ) external virtual override judgeExpired(deadline) returns (uint256 shares,uint256 baseAdjustedInAmount,uint256 quoteAdjustedInAmount) {
        (baseAdjustedInAmount, quoteAdjustedInAmount) = _addDVMLiquidity(DVMAddress,baseInAmount,quoteInAmount);
        require(baseAdjustedInAmount >= baseMinAmount && quoteAdjustedInAmount >= quoteMinAmount, 'DODOV2Proxy01: deposit amount is not enough');
        address _dvm = DVMAddress;
        if(baseAdjustedInAmount > 0) {
            IDODOV2(dodoApprove).claimTokens(IDODOV2(_dvm)._BASE_TOKEN_(), msg.sender, _dvm, baseAdjustedInAmount);
        }
        if(quoteAdjustedInAmount > 0)
            IDODOV2(dodoApprove).claimTokens(IDODOV2(_dvm)._QUOTE_TOKEN_(), msg.sender, _dvm, quoteAdjustedInAmount);
        (shares,,) = IDODOV2(_dvm).buyShares(to);
    }

    function addDVMLiquidityETH(
        address DVMAddress,
        address to,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint8 flag, // 1 - baseInETH, 2 - quoteInETH
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (uint256 shares,uint256 baseAdjustedInAmount,uint256 quoteAdjustedInAmount) {
        (baseAdjustedInAmount, quoteAdjustedInAmount) = _addDVMLiquidity(DVMAddress,baseInAmount,quoteInAmount);
        require(baseAdjustedInAmount >= baseMinAmount && quoteAdjustedInAmount >= quoteMinAmount, 'DODOV2Proxy01: deposit amount is not enough');
        address _dvm = DVMAddress;
        if(baseAdjustedInAmount > 0) {
            if(flag == 1) {
                require(msg.value >= baseAdjustedInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: baseAdjustedInAmount}();
                assert(IWETH(_WETH_).transfer(_dvm, baseAdjustedInAmount));
                if (msg.value > baseAdjustedInAmount) {
                    (bool success,) = msg.sender.call{value:msg.value - baseAdjustedInAmount}(new bytes(0));
                    require(success, 'DODOV2Proxy01: ETH_TRANSFER_FAILED');
                }
            }else {
                IDODOV2(dodoApprove).claimTokens(IDODOV2(_dvm)._BASE_TOKEN_(), msg.sender, _dvm, baseAdjustedInAmount);
            }
        }
        if(quoteAdjustedInAmount > 0){
            if(flag == 2) {
                require(msg.value >= quoteAdjustedInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: quoteAdjustedInAmount}();
                assert(IWETH(_WETH_).transfer(_dvm, quoteAdjustedInAmount));
                if (msg.value > quoteAdjustedInAmount) { 
                    (bool success,) = msg.sender.call{value:msg.value - quoteAdjustedInAmount}(new bytes(0));
                    require(success, 'DODOV2Proxy01: ETH_TRANSFER_FAILED');
                } 
            }else {
              IDODOV2(dodoApprove).claimTokens(IDODOV2(_dvm)._QUOTE_TOKEN_(), msg.sender, _dvm, quoteAdjustedInAmount);  
            }
        }
        (shares,,) = IDODOV2(_dvm).buyShares(to);
    }

    function createDODOPrivatePool(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (address newPrivatePool) {
        newPrivatePool = IDODOV2(dppFactory).createDODOPrivatePool();
        if(baseInAmount > 0){
            if(baseToken != ETH_ADDRESS){
                IDODOV2(dodoApprove).claimTokens(baseToken, msg.sender, newPrivatePool, baseInAmount);
            }else {
                require(msg.value == baseInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: baseInAmount}();
                assert(IWETH(_WETH_).transfer(newPrivatePool, baseInAmount));
                baseToken = _WETH_;
            }
        }
        if(quoteInAmount > 0){
            if(quoteToken != ETH_ADDRESS){
                IDODOV2(dodoApprove).claimTokens(quoteToken, msg.sender, newPrivatePool, quoteInAmount);
            }else {
                require(msg.value == quoteInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: quoteInAmount}();
                assert(IWETH(_WETH_).transfer(newPrivatePool, quoteInAmount));
                quoteToken = _WETH_;
            }
        }
        IDODOV2(dppFactory).initDODOPrivatePool(
            newPrivatePool,
            msg.sender,
            baseToken,
            quoteToken,
            lpFeeRate,
            mtFeeRate,
            k,
            i
        );
    }

    function resetDODOPrivatePool(
        address DPPAddress,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint256 deadline
    ) external virtual override judgeExpired(deadline) {
        if(baseInAmount > 0)
            IDODOV2(dodoApprove).claimTokens(IDODOV2(DPPAddress)._BASE_TOKEN_(), msg.sender, DPPAddress, baseInAmount);
        if(quoteInAmount > 0)
            IDODOV2(dodoApprove).claimTokens(IDODOV2(DPPAddress)._QUOTE_TOKEN_(), msg.sender, DPPAddress, quoteInAmount);
        IDODOV2(IDODOV2(DPPAddress)._OWNER_()).reset(
            msg.sender,
            newLpFeeRate,
            newMtFeeRate,
            newI,
            newK,
            baseOutAmount,
            quoteOutAmount
        );
    }

    function resetDODOPrivatePoolETH(
        address DPPAddress,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint8 flag, // 1 - baseInETH, 2 - quoteInETH, 3 - baseOutETH, 4 - quoteOutETH
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) {
        if(baseInAmount > 0){
            if(flag == 1){
                require(msg.value == baseInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: baseInAmount}();
                assert(IWETH(_WETH_).transfer(DPPAddress, baseInAmount));
            }else {
                IDODOV2(dodoApprove).claimTokens(IDODOV2(DPPAddress)._BASE_TOKEN_(), msg.sender, DPPAddress, baseInAmount);
            }
        }
        if(quoteInAmount > 0){
            if(flag == 2){
                require(msg.value == quoteInAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
                IWETH(_WETH_).deposit{value: quoteInAmount}();
                assert(IWETH(_WETH_).transfer(DPPAddress, quoteInAmount));  
            }else {
                IDODOV2(dodoApprove).claimTokens(IDODOV2(DPPAddress)._QUOTE_TOKEN_(), msg.sender, DPPAddress, quoteInAmount);
            }
        }
        if( (flag == 3 && baseOutAmount > 0) || (flag == 4 && quoteOutAmount > 0) ) {
            IDODOV2(IDODOV2(DPPAddress)._OWNER_()).resetETH(
                msg.sender,
                newLpFeeRate,
                newMtFeeRate,
                newI,
                newK,
                baseOutAmount,
                quoteOutAmount
            ); 
            if(baseOutAmount > 0) {
                if(flag == 3) {
                    uint256 wethAmount = IWETH(_WETH_).balanceOf(address(this));
                    IWETH(_WETH_).withdraw(wethAmount);
                    (bool success,) = msg.sender.call{value:wethAmount}(new bytes(0));
                    require(success, 'DODOV2Proxy01: ETH_TRANSFER_FAILED');
                }else {
                    IERC20(IDODOV2(DPPAddress)._BASE_TOKEN_()).universalTransfer(msg.sender, baseOutAmount);                    
                }
            }

            if(quoteOutAmount > 0) {
                if(flag == 4) {
                    uint256 wethAmount = IWETH(_WETH_).balanceOf(address(this));
                    IWETH(_WETH_).withdraw(wethAmount);
                    (bool success,) = msg.sender.call{value:wethAmount}(new bytes(0));
                    require(success, 'DODOV2Proxy01: ETH_TRANSFER_FAILED');
                }else {
                    IERC20(IDODOV2(DPPAddress)._QUOTE_TOKEN_()).universalTransfer(msg.sender, quoteOutAmount);                    
                }
            } 
        }else {
            IDODOV2(IDODOV2(DPPAddress)._OWNER_()).reset(
                msg.sender,
                newLpFeeRate,
                newMtFeeRate,
                newI,
                newK,
                baseOutAmount,
                quoteOutAmount
            ); 
        }
    }

    function dodoSwapETHToToken(
        address payable assetTo,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256[] memory directions,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (uint256 returnAmount) {
        require(minReturnAmount > 0, 'DODOV2Proxy01: Min return should be bigger than 0.');
        require(msg.value == fromTokenAmount, 'DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH');
        IWETH(_WETH_).deposit{value: fromTokenAmount}();
        IWETH(_WETH_).transfer(dodoPairs[0],IWETH(_WETH_).balanceOf(address(this)));

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if(i == dodoPairs.length - 1){
                if (directions[i] == 0) {
                    returnAmount = IDODOV2(dodoPairs[i]).sellBase(assetTo);
                } else {
                    returnAmount = IDODOV2(dodoPairs[i]).sellQuote(assetTo);
                }
            } else {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i+1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i+1]);
                }
            }
        }
        require(returnAmount >= minReturnAmount, 'DODOV2Proxy01: Return amount is not enough');
        emit OrderHistory(ETH_ADDRESS, toToken, assetTo, fromTokenAmount, returnAmount, block.timestamp);
    }

    function dodoSwapTokenToETH(
        address payable assetTo,
        address fromToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256[] memory directions,
        uint256 deadline
    ) external virtual override judgeExpired(deadline) returns (uint256 returnAmount) {
        require(minReturnAmount > 0, 'DODOV2Proxy01: Min return should be bigger than 0.');
        IDODOV2(dodoApprove).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if(i == dodoPairs.length - 1){
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(address(this));
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(address(this));
                }
            } else {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i+1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i+1]);
                }
            }
        }
        returnAmount = IWETH(_WETH_).balanceOf(address(this));
        IWETH(_WETH_).withdraw(returnAmount);
        require(returnAmount >= minReturnAmount, 'DODOV2Proxy01: Return amount is not enough');
        IERC20(ETH_ADDRESS).universalTransfer(assetTo, returnAmount);
        emit OrderHistory(fromToken, ETH_ADDRESS, assetTo, fromTokenAmount, returnAmount, block.timestamp);
    }


    function dodoSwapTokenToToken(
        address payable assetTo,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256[] memory directions,
        uint256 deadline
    ) external virtual override judgeExpired(deadline) returns (uint256 returnAmount) {
        require(minReturnAmount > 0, 'DODOV2Proxy01: Min return should be bigger than 0.');
        IDODOV2(dodoApprove).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if(i == dodoPairs.length - 1){
                if (directions[i] == 0) {
                    returnAmount = IDODOV2(dodoPairs[i]).sellBase(assetTo);
                } else {
                    returnAmount = IDODOV2(dodoPairs[i]).sellQuote(assetTo);
                }
            } else {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i+1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i+1]);
                }
            }
        }
        require(returnAmount >= minReturnAmount, 'DODOV2Proxy01: Return amount is not enough');
        emit OrderHistory(fromToken, toToken, assetTo, fromTokenAmount, returnAmount, block.timestamp);
    }

    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address to,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (uint256 returnAmount) {
        require(minReturnAmount > 0, 'DODOV2Proxy01: Min return should be bigger then 0.');
        if (fromToken != ETH_ADDRESS) {
            IDODOV2(dodoApprove).claimTokens(fromToken, msg.sender, address(this), fromTokenAmount);
            IERC20(fromToken).universalApprove(approveTarget, fromTokenAmount);
        }

        (bool success, ) = to.call{value: fromToken == ETH_ADDRESS ? msg.value : 0}(callDataConcat);

        require(success, 'DODOV2Proxy01: Contract Swap execution Failed');

        IERC20(fromToken).universalTransfer(msg.sender, IERC20(fromToken).universalBalanceOf(address(this)));
        returnAmount = IERC20(toToken).universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, 'DODOV2Proxy01: Return amount is not enough');
        IERC20(toToken).universalTransfer(msg.sender, returnAmount);
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount, block.timestamp);
    }
}
