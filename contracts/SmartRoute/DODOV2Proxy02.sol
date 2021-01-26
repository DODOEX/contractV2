/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOV2Proxy01} from "./intf/IDODOV2Proxy01.sol";
import {IDODOV2} from "./intf/IDODOV2.sol";
import {IDODOV1} from "./intf/IDODOV1.sol";
import {IDODOApproveProxy} from "./DODOApproveProxy.sol";
import {IDODOSellHelper} from "./helper/DODOSellHelper.sol";
import {IERC20} from "../intf/IERC20.sol";
import {IWETH} from "../intf/IWETH.sol";
import {IUni} from "./intf/IUni.sol";
import {IChi} from "./intf/IChi.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {UniversalERC20} from "./lib/UniversalERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {IDODOIncentive} from "../DODOToken/DODOIncentive.sol";
import {IDODOAdapter} from "./intf/IDODOAdapter.sol";

/**
 * @title DODOV2Proxy02
 * @author DODO Breeder
 *
 * @notice Entrance of trading in DODO platform
 */
contract DODOV2Proxy02 is IDODOV2Proxy01, ReentrancyGuard, InitializableOwnable {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;
    address public immutable _DODO_SELL_HELPER_;
    address public immutable _DVM_FACTORY_;
    address public immutable _DPP_FACTORY_;
    address public immutable _CP_FACTORY_;
    address public immutable _DODO_INCENTIVE_;
    address public immutable _CHI_TOKEN_;
    uint256 public _GAS_DODO_MAX_RETURN_ = 0;
    uint256 public _GAS_EXTERNAL_RETURN_ = 0;
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
        require(deadLine >= block.timestamp, "DODOV2Proxy02: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor(
        address dvmFactory,
        address dppFactory,
        address cpFactory,
        address payable weth,
        address dodoApproveProxy,
        address dodoSellHelper,
        address chiToken,
        address dodoIncentive
    ) public {
        _DVM_FACTORY_ = dvmFactory;
        _DPP_FACTORY_ = dppFactory;
        _CP_FACTORY_ = cpFactory;
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
        _DODO_SELL_HELPER_ = dodoSellHelper;
        _CHI_TOKEN_ = chiToken;
        _DODO_INCENTIVE_ = dodoIncentive;
    }

    function addWhiteList (address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = true;
    }

    function removeWhiteList (address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = false;
    }

    function updateGasReturn(uint256 newDodoGasReturn, uint256 newExternalGasReturn) public onlyOwner {
        _GAS_DODO_MAX_RETURN_ = newDodoGasReturn;
        _GAS_EXTERNAL_RETURN_ = newExternalGasReturn;
    }

    // ============ DVM Functions (create & add liquidity) ============

    function createDODOVendingMachine(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 i,
        uint256 k,
        bool isOpenTWAP,
        uint256 deadLine
    )
        external
        override
        payable
        preventReentrant
        judgeExpired(deadLine)
        returns (address newVendingMachine, uint256 shares)
    {
        {
            address _baseToken = baseToken == _ETH_ADDRESS_ ? _WETH_ : baseToken;
            address _quoteToken = quoteToken == _ETH_ADDRESS_ ? _WETH_ : quoteToken;
            newVendingMachine = IDODOV2(_DVM_FACTORY_).createDODOVendingMachine(
                _baseToken,
                _quoteToken,
                lpFeeRate,
                i,
                k,
                isOpenTWAP
            );
        }

        {
            address _baseToken = baseToken;
            address _quoteToken = quoteToken;
            _deposit(
                msg.sender,
                newVendingMachine,
                _baseToken,
                baseInAmount,
                _baseToken == _ETH_ADDRESS_
            );
            _deposit(
                msg.sender,
                newVendingMachine,
                _quoteToken,
                quoteInAmount,
                _quoteToken == _ETH_ADDRESS_
            );
        }

        (shares, , ) = IDODOV2(newVendingMachine).buyShares(msg.sender);
    }

    function addDVMLiquidity(
        address dvmAddress,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint8 flag, // 0 - ERC20, 1 - baseInETH, 2 - quoteInETH
        uint256 deadLine
    )
        external
        override
        payable
        preventReentrant
        judgeExpired(deadLine)
        returns (
            uint256 shares,
            uint256 baseAdjustedInAmount,
            uint256 quoteAdjustedInAmount
        )
    {
        address _dvm = dvmAddress;
        (baseAdjustedInAmount, quoteAdjustedInAmount) = _addDVMLiquidity(
            _dvm,
            baseInAmount,
            quoteInAmount
        );
        require(
            baseAdjustedInAmount >= baseMinAmount && quoteAdjustedInAmount >= quoteMinAmount,
            "DODOV2Proxy02: deposit amount is not enough"
        );

        _deposit(msg.sender, _dvm, IDODOV2(_dvm)._BASE_TOKEN_(), baseAdjustedInAmount, flag == 1);
        _deposit(msg.sender, _dvm, IDODOV2(_dvm)._QUOTE_TOKEN_(), quoteAdjustedInAmount, flag == 2);
        
        (shares, , ) = IDODOV2(_dvm).buyShares(msg.sender);
        // refund dust eth
        if (flag == 1 && msg.value > baseAdjustedInAmount) msg.sender.transfer(msg.value - baseAdjustedInAmount);
        if (flag == 2 && msg.value > quoteAdjustedInAmount) msg.sender.transfer(msg.value - quoteAdjustedInAmount);
    }

    function _addDVMLiquidity(
        address dvmAddress,
        uint256 baseInAmount,
        uint256 quoteInAmount
    ) internal view returns (uint256 baseAdjustedInAmount, uint256 quoteAdjustedInAmount) {
        (uint256 baseReserve, uint256 quoteReserve) = IDODOV2(dvmAddress).getVaultReserve();
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

    // ============ DPP Functions (create & reset) ============

    function createDODOPrivatePool(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 i,
        uint256 k,
        bool isOpenTwap,
        uint256 deadLine
    )
        external
        override
        payable
        preventReentrant
        judgeExpired(deadLine)
        returns (address newPrivatePool)
    {
        newPrivatePool = IDODOV2(_DPP_FACTORY_).createDODOPrivatePool();

        address _baseToken = baseToken;
        address _quoteToken = quoteToken;
        _deposit(msg.sender, newPrivatePool, _baseToken, baseInAmount, _baseToken == _ETH_ADDRESS_);
        _deposit(
            msg.sender,
            newPrivatePool,
            _quoteToken,
            quoteInAmount,
            _quoteToken == _ETH_ADDRESS_
        );

        if (_baseToken == _ETH_ADDRESS_) _baseToken = _WETH_;
        if (_quoteToken == _ETH_ADDRESS_) _quoteToken = _WETH_;

        IDODOV2(_DPP_FACTORY_).initDODOPrivatePool(
            newPrivatePool,
            msg.sender,
            _baseToken,
            _quoteToken,
            lpFeeRate,
            k,
            i,
            isOpenTwap
        );
    }

    function resetDODOPrivatePool(
        address dppAddress,
        uint256[] memory paramList,  //0 - newLpFeeRate, 1 - newI, 2 - newK
        uint256[] memory amountList, //0 - baseInAmount, 1 - quoteInAmount, 2 - baseOutAmount, 3- quoteOutAmount
        uint8 flag, // 0 - ERC20, 1 - baseInETH, 2 - quoteInETH, 3 - baseOutETH, 4 - quoteOutETH
        uint256 minBaseReserve,
        uint256 minQuoteReserve,
        uint256 deadLine
    ) external override payable preventReentrant judgeExpired(deadLine) {
        _deposit(
            msg.sender,
            dppAddress,
            IDODOV2(dppAddress)._BASE_TOKEN_(),
            amountList[0],
            flag == 1
        );
        _deposit(
            msg.sender,
            dppAddress,
            IDODOV2(dppAddress)._QUOTE_TOKEN_(),
            amountList[1],
            flag == 2
        );

        require(IDODOV2(IDODOV2(dppAddress)._OWNER_()).reset(
            msg.sender,
            paramList[0],
            paramList[1],
            paramList[2],
            amountList[2],
            amountList[3],
            minBaseReserve,
            minQuoteReserve
        ), "Reset Failed");

        _withdraw(msg.sender, IDODOV2(dppAddress)._BASE_TOKEN_(), amountList[2], flag == 3);
        _withdraw(msg.sender, IDODOV2(dppAddress)._QUOTE_TOKEN_(), amountList[3], flag == 4);
    }

    // ============ Swap ============

    function dodoSwapV2ETHToToken(
        address toToken,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        bool isIncentive,
        uint256 deadLine
    )
        external
        override
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        require(dodoPairs.length > 0, "DODOV2Proxy02: PAIRS_EMPTY");
        require(minReturnAmount > 0, "DODOV2Proxy02: RETURN_AMOUNT_ZERO");
        uint256 originGas = gasleft();
        
        uint256 originToTokenBalance = IERC20(toToken).balanceOf(msg.sender);
        IWETH(_WETH_).deposit{value: msg.value}();
        IWETH(_WETH_).transfer(dodoPairs[0], msg.value);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if (i == dodoPairs.length - 1) {
                if (directions & 1 == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(msg.sender);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(msg.sender);
                }
            } else {
                if (directions & 1 == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i + 1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i + 1]);
                }
            }
            directions = directions >> 1;
        }

        returnAmount = IERC20(toToken).balanceOf(msg.sender).sub(originToTokenBalance);
        require(returnAmount >= minReturnAmount, "DODOV2Proxy02: Return amount is not enough");

        _dodoGasReturn(originGas);

        _execIncentive(isIncentive, _ETH_ADDRESS_, toToken);

        emit OrderHistory(
            _ETH_ADDRESS_,
            toToken,
            msg.sender,
            msg.value,
            returnAmount
        );
    }

    function dodoSwapV2TokenToETH(
        address fromToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        bool isIncentive,
        uint256 deadLine
    )
        external
        override
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        require(dodoPairs.length > 0, "DODOV2Proxy02: PAIRS_EMPTY");
        require(minReturnAmount > 0, "DODOV2Proxy02: RETURN_AMOUNT_ZERO");
        uint256 originGas = gasleft();
        
        IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if (i == dodoPairs.length - 1) {
                if (directions & 1 == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(address(this));
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(address(this));
                }
            } else {
                if (directions & 1 == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i + 1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i + 1]);
                }
            }
            directions = directions >> 1;
        }
        returnAmount = IWETH(_WETH_).balanceOf(address(this));
        require(returnAmount >= minReturnAmount, "DODOV2Proxy02: Return amount is not enough");
        IWETH(_WETH_).withdraw(returnAmount);
        msg.sender.transfer(returnAmount);

        _dodoGasReturn(originGas);

        _execIncentive(isIncentive, fromToken, _ETH_ADDRESS_);

        emit OrderHistory(
            fromToken,
            _ETH_ADDRESS_,
            msg.sender,
            fromTokenAmount,
            returnAmount
        );
    }

    function dodoSwapV2TokenToToken(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        bool isIncentive,
        uint256 deadLine
    )
        external
        override
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        require(dodoPairs.length > 0, "DODOV2Proxy02: PAIRS_EMPTY");
        require(minReturnAmount > 0, "DODOV2Proxy02: RETURN_AMOUNT_ZERO");
        uint256 originGas = gasleft();

        uint256 originToTokenBalance = IERC20(toToken).balanceOf(msg.sender);
        IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if (i == dodoPairs.length - 1) {
                if (directions & 1 == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(msg.sender);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(msg.sender);
                }
            } else {
                if (directions& 1 == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i + 1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i + 1]);
                }
            }
            directions = directions >> 1;
        }
        returnAmount = IERC20(toToken).balanceOf(msg.sender).sub(originToTokenBalance);
        require(returnAmount >= minReturnAmount, "DODOV2Proxy02: Return amount is not enough");
        
        _dodoGasReturn(originGas);

        _execIncentive(isIncentive, fromToken, toToken);

        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount
        );
    }

    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address swapTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        bool isIncentive,
        uint256 deadLine
    )
        external
        override
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        require(minReturnAmount > 0, "DODOV2Proxy02: RETURN_AMOUNT_ZERO");
        require(fromToken != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_SELL_CHI");
        require(toToken != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_BUY_CHI");
        
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

        require(isWhiteListed[swapTarget], "DODOV2Proxy02: Not Whitelist Contract");
        (bool success, ) = swapTarget.call{value: fromToken == _ETH_ADDRESS_ ? msg.value : 0}(callDataConcat);

        require(success, "DODOV2Proxy02: External Swap execution Failed");

        IERC20(toToken).universalTransfer(
            msg.sender,
            IERC20(toToken).universalBalanceOf(address(this))
        );

        returnAmount = IERC20(toToken).universalBalanceOf(msg.sender).sub(toTokenOriginBalance);
        require(returnAmount >= minReturnAmount, "DODOV2Proxy02: Return amount is not enough");

        _externalGasReturn();

        _execIncentive(isIncentive, fromToken, toToken);

        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount
        );
    }

    function dodoSwapV1(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        bool isIncentive,
        uint256 deadLine
    )
        external
        override
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        require(dodoPairs.length > 0, "DODOV2Proxy02: PAIRS_EMPTY");
        require(minReturnAmount > 0, "DODOV2Proxy02: RETURN_AMOUNT_ZERO");
        require(fromToken != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_SELL_CHI");
        require(toToken != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_BUY_CHI");
        
        uint256 originGas = gasleft();

        address _fromToken = fromToken;
        address _toToken = toToken;
        
        _deposit(msg.sender, address(this), _fromToken, fromTokenAmount, _fromToken == _ETH_ADDRESS_);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            address curDodoPair = dodoPairs[i];
            if (directions & 1 == 0) {
                address curDodoBase = IDODOV1(curDodoPair)._BASE_TOKEN_();
                require(curDodoBase != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_CHI");
                uint256 curAmountIn = IERC20(curDodoBase).balanceOf(address(this));
                IERC20(curDodoBase).universalApproveMax(curDodoPair, curAmountIn);
                IDODOV1(curDodoPair).sellBaseToken(curAmountIn, 0, "");
            } else {
                address curDodoQuote = IDODOV1(curDodoPair)._QUOTE_TOKEN_();
                require(curDodoQuote != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_CHI");
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

        
        if (_toToken == _ETH_ADDRESS_) {
            returnAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(returnAmount);
        } else {
            returnAmount = IERC20(_toToken).tokenBalanceOf(address(this));
        }
        
        require(returnAmount >= minReturnAmount, "DODOV2Proxy02: Return amount is not enough");
        IERC20(_toToken).universalTransfer(msg.sender, returnAmount);

        _dodoGasReturn(originGas);

        _execIncentive(isIncentive, _fromToken, _toToken);

        emit OrderHistory(_fromToken, _toToken, msg.sender, fromTokenAmount, returnAmount);
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
        bool isIncentive,
        uint256 deadLine
    ) external override payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        require(mixPairs.length > 0, "DODOV2Proxy02: PAIRS_EMPTY");
        require(mixPairs.length == mixAdapters.length, "DODOV2Proxy02: PAIR_ADAPTER_NOT_MATCH");
        require(mixPairs.length == assetTo.length - 1, "DODOV2Proxy02: PAIR_ASSETTO_NOT_MATCH");
        require(minReturnAmount > 0, "DODOV2Proxy02: RETURN_AMOUNT_ZERO");

        address _fromToken = fromToken;
        address _toToken = toToken;
        uint256 _fromTokenAmount = fromTokenAmount;

        require(_fromToken != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_SELL_CHI");
        require(_toToken != _CHI_TOKEN_, "DODOV2Proxy02: NOT_SUPPORT_BUY_CHI");
        
        uint256 originGas = gasleft();
        uint256 toTokenOriginBalance = IERC20(_toToken).universalBalanceOf(msg.sender);
        
        _deposit(msg.sender, assetTo[0], _fromToken, _fromTokenAmount, _fromToken == _ETH_ADDRESS_);

        for (uint256 i = 0; i < mixPairs.length; i++) {
            if (directions & 1 == 0) {
                IDODOAdapter(mixAdapters[i]).sellBase(assetTo[i + 1],mixPairs[i]);
            } else {
                IDODOAdapter(mixAdapters[i]).sellQuote(assetTo[i + 1],mixPairs[i]);
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

        require(returnAmount >= minReturnAmount, "DODOV2Proxy02: Return amount is not enough");
        
        _dodoGasReturn(originGas);

        _execIncentive(isIncentive, _fromToken, _toToken);

        emit OrderHistory(
            _fromToken,
            _toToken,
            msg.sender,
            _fromTokenAmount,
            returnAmount
        );
    }

    //============ CrowdPooling Functions (create & bid) ============

    function createCrowdPooling(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256[] memory timeLine,
        uint256[] memory valueList,
        bool isOpenTWAP,
        uint256 deadLine
    ) external override payable preventReentrant judgeExpired(deadLine) returns (address payable newCrowdPooling) {
        address _baseToken = baseToken;
        address _quoteToken = quoteToken == _ETH_ADDRESS_ ? _WETH_ : quoteToken;
        
        newCrowdPooling = IDODOV2(_CP_FACTORY_).createCrowdPooling();

        _deposit(
            msg.sender,
            newCrowdPooling,
            _baseToken,
            baseInAmount,
            false
        );

        newCrowdPooling.transfer(msg.value);

        IDODOV2(_CP_FACTORY_).initCrowdPooling(
            newCrowdPooling,
            msg.sender,
            _baseToken,
            _quoteToken,
            timeLine,
            valueList,
            isOpenTWAP
        );
    }

    function bid(
        address cpAddress,
        uint256 quoteAmount,
        uint8 flag, // 0 - ERC20, 1 - quoteInETH
        uint256 deadLine
    ) external override payable preventReentrant judgeExpired(deadLine) {
        _deposit(msg.sender, cpAddress, IDODOV2(cpAddress)._QUOTE_TOKEN_(), quoteAmount, flag == 1);
        IDODOV2(cpAddress).bid(msg.sender);
    }


    function addLiquidityToV1(
        address pair,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 baseMinShares,
        uint256 quoteMinShares,
        uint8 flag, // 0 erc20 In  1 baseInETH  2 quoteIn ETH 
        uint256 deadLine
    ) external override payable preventReentrant judgeExpired(deadLine) returns(uint256 baseShares, uint256 quoteShares) {
        address _baseToken = IDODOV1(pair)._BASE_TOKEN_();
        address _quoteToken = IDODOV1(pair)._QUOTE_TOKEN_();
        
        _deposit(msg.sender, address(this), _baseToken, baseAmount, flag == 1);
        _deposit(msg.sender, address(this), _quoteToken, quoteAmount, flag == 2);

        
        if(baseAmount > 0) {
            IERC20(_baseToken).universalApproveMax(pair, baseAmount);
            baseShares = IDODOV1(pair).depositBaseTo(msg.sender, baseAmount);
        }
        if(quoteAmount > 0) {
            IERC20(_quoteToken).universalApproveMax(pair, quoteAmount);
            quoteShares = IDODOV1(pair).depositQuoteTo(msg.sender, quoteAmount);
        }

        require(baseShares >= baseMinShares && quoteShares >= quoteMinShares,"DODOV2Proxy02: Return DLP is not enough");
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

    function _withdraw(
        address payable to,
        address token,
        uint256 amount,
        bool isETH
    ) internal {
        if (isETH) {
            if (amount > 0) {
                IWETH(_WETH_).withdraw(amount);
                to.transfer(amount);
            }
        } else {
            if (amount > 0) {
                SafeERC20.safeTransfer(IERC20(token), to, amount);
            }
        }
    }

    function _dodoGasReturn(uint256 originGas) internal {
        uint256 _gasDodoMaxReturn = _GAS_DODO_MAX_RETURN_;
        if(_gasDodoMaxReturn > 0) {
            uint256 calcGasTokenBurn = originGas.sub(gasleft()) / 65000;
            uint256 gasTokenBurn = calcGasTokenBurn > _gasDodoMaxReturn ? _gasDodoMaxReturn : calcGasTokenBurn;
            if(gasTokenBurn >= 3 && gasleft() > 27710 + gasTokenBurn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(gasTokenBurn);
        }
    }

    function _externalGasReturn() internal {
        uint256 _gasExternalReturn = _GAS_EXTERNAL_RETURN_;
        if(_gasExternalReturn > 0) {
            if(gasleft() > 27710 + _gasExternalReturn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(_gasExternalReturn);
        }
    }

    function _execIncentive(bool isIncentive, address fromToken,address toToken) internal {
        if(isIncentive && gasleft() > 30000) {
            IDODOIncentive(_DODO_INCENTIVE_).triggerIncentive(fromToken, toToken, msg.sender);
        }
    }

}
