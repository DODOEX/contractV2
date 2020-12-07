/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOV2Proxy01} from "./intf/IDODOV2Proxy01.sol";
import {IDODOV2} from "./intf/IDODOV2.sol";
import {IDODOV1} from "./intf/IDODOV1.sol";
import {IDODOApprove} from "../intf/IDODOApprove.sol";
import {IDODOSellHelper} from "./helper/DODOSellHelper.sol";
import {IERC20} from "../intf/IERC20.sol";
import {IWETH} from "../intf/IWETH.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {UniversalERC20} from "./lib/UniversalERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";

contract DODOV2Proxy01 is IDODOV2Proxy01, ReentrancyGuard {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_;
    address public immutable _DODO_SELL_HELPER_;
    address public immutable _DVM_FACTORY_;
    address public immutable _DPP_FACTORY_;

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
        require(deadLine >= block.timestamp, "DODOV2Proxy01: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor(
        address dvmFactory,
        address dppFactory,
        address payable weth,
        address dodoApprove,
        address dodoSellHelper
    ) public {
        _DVM_FACTORY_ = dvmFactory;
        _DPP_FACTORY_ = dppFactory;
        _WETH_ = weth;
        _DODO_APPROVE_ = dodoApprove;
        _DODO_SELL_HELPER_ = dodoSellHelper;
    }

    // ============ DVM Functions (create & add liquidity) ============

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
                msg.sender,
                _baseToken,
                _quoteToken,
                lpFeeRate,
                mtFeeRate,
                i,
                k
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

        (shares, , ) = IDODOV2(newVendingMachine).buyShares(assetTo);
    }

    function addDVMLiquidity(
        address dvmAddress,
        address to,
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
        (baseAdjustedInAmount, quoteAdjustedInAmount) = _addDVMLiquidity(
            dvmAddress,
            baseInAmount,
            quoteInAmount
        );
        require(
            baseAdjustedInAmount >= baseMinAmount && quoteAdjustedInAmount >= quoteMinAmount,
            "DODOV2Proxy01: deposit amount is not enough"
        );
        address _dvm = dvmAddress;

        _deposit(msg.sender, _dvm, IDODOV2(_dvm)._BASE_TOKEN_(), baseAdjustedInAmount, flag == 1);
        _deposit(msg.sender, _dvm, IDODOV2(_dvm)._QUOTE_TOKEN_(), quoteAdjustedInAmount, flag == 2);
        
        (shares, , ) = IDODOV2(_dvm).buyShares(to);
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
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
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
            mtFeeRate,
            k,
            i
        );
    }

    function resetDODOPrivatePool(
        address dppAddress,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint8 flag, // 0 - ERC20, 1 - baseInETH, 2 - quoteInETH, 3 - baseOutETH, 4 - quoteOutETH
        uint256 deadLine
    ) external override payable preventReentrant judgeExpired(deadLine) {
        _deposit(
            msg.sender,
            dppAddress,
            IDODOV2(dppAddress)._BASE_TOKEN_(),
            baseInAmount,
            flag == 1
        );
        _deposit(
            msg.sender,
            dppAddress,
            IDODOV2(dppAddress)._QUOTE_TOKEN_(),
            quoteInAmount,
            flag == 2
        );

        IDODOV2(IDODOV2(dppAddress)._OWNER_()).reset(
            msg.sender,
            newLpFeeRate,
            newMtFeeRate,
            newI,
            newK,
            baseOutAmount,
            quoteOutAmount
        );

        _withdraw(msg.sender, IDODOV2(dppAddress)._BASE_TOKEN_(), baseOutAmount, flag == 3);
        _withdraw(msg.sender, IDODOV2(dppAddress)._QUOTE_TOKEN_(), quoteOutAmount, flag == 4);
    }

    // ============ Swap ============

    function dodoSwapV2ETHToToken(
        address payable assetTo,
        address toToken,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadLine
    )
        external
        override
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        uint256 originToTokenBalance = IERC20(toToken).balanceOf(msg.sender);

        IWETH(_WETH_).deposit{value: msg.value}();
        IWETH(_WETH_).transfer(dodoPairs[0], msg.value);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if (i == dodoPairs.length - 1) {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(assetTo);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(assetTo);
                }
            } else {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i + 1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i + 1]);
                }
            }
        }

        returnAmount = IERC20(toToken).balanceOf(msg.sender).sub(originToTokenBalance);
        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");
        emit OrderHistory(
            _ETH_ADDRESS_,
            toToken,
            assetTo,
            msg.value,
            returnAmount
        );
    }

    function dodoSwapV2TokenToETH(
        address payable assetTo,
        address fromToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadLine
    )
        external
        override
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        IDODOApprove(_DODO_APPROVE_).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if (i == dodoPairs.length - 1) {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(address(this));
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(address(this));
                }
            } else {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i + 1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i + 1]);
                }
            }
        }
        returnAmount = IWETH(_WETH_).balanceOf(address(this));
        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");
        IWETH(_WETH_).withdraw(returnAmount);
        assetTo.transfer(returnAmount);
        emit OrderHistory(
            fromToken,
            _ETH_ADDRESS_,
            assetTo,
            fromTokenAmount,
            returnAmount
        );
    }

    function dodoSwapV2TokenToToken(
        address payable assetTo,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadLine
    )
        external
        override
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        uint256 originToTokenBalance = IERC20(toToken).balanceOf(msg.sender);
        IDODOApprove(_DODO_APPROVE_).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            if (i == dodoPairs.length - 1) {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(assetTo);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(assetTo);
                }
            } else {
                if (directions[i] == 0) {
                    IDODOV2(dodoPairs[i]).sellBase(dodoPairs[i + 1]);
                } else {
                    IDODOV2(dodoPairs[i]).sellQuote(dodoPairs[i + 1]);
                }
            }
        }
        returnAmount = IERC20(toToken).balanceOf(msg.sender).sub(originToTokenBalance);
        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");
        emit OrderHistory(
            fromToken,
            toToken,
            assetTo,
            fromTokenAmount,
            returnAmount
        );
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
    )
        external
        override
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
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

        require(success, "DODOV2Proxy01: Contract Swap execution Failed");

        IERC20(fromToken).universalTransfer(
            msg.sender,
            IERC20(fromToken).universalBalanceOf(address(this))
        );

        IERC20(toToken).universalTransfer(
            msg.sender,
            IERC20(toToken).universalBalanceOf(address(this))
        );

        returnAmount = IERC20(toToken).universalBalanceOf(msg.sender).sub(toTokenOriginBalance);
        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");

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
        uint8[] memory directions,
        uint256 deadLine
    )
        external
        override
        payable
        judgeExpired(deadLine)
        returns (uint256 returnAmount)
    {
        _deposit(msg.sender, address(this), fromToken, fromTokenAmount, fromToken == _ETH_ADDRESS_);

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
        
        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");
        IERC20(toToken).universalTransfer(msg.sender, returnAmount);

        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
    }


    function addLiquidityToV1(
        address to,
        address pair,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 baseMinShares,
        uint256 quoteMinShares,
        uint8 flag, // 0 erc20 In  1 baseInETH  2 quoteIn ETH 
        uint256 deadLine
    ) external override payable judgeExpired(deadLine) returns(uint256 baseShares, uint256 quoteShares) {
        address _baseToken = IDODOV1(pair)._BASE_TOKEN_();
        address _quoteToken = IDODOV1(pair)._QUOTE_TOKEN_();
        
        _deposit(msg.sender, address(this), _baseToken, baseAmount, flag == 1);
        _deposit(msg.sender, address(this), _quoteToken, quoteAmount, flag == 2);

        
        if(baseAmount > 0) {
            IERC20(_baseToken).universalApproveMax(pair, baseAmount);
            baseShares = IDODOV1(pair).depositBaseTo(to, baseAmount);
        }
        if(quoteAmount > 0) {
            IERC20(_quoteToken).universalApproveMax(pair, quoteAmount);
            quoteShares = IDODOV1(pair).depositQuoteTo(to, quoteAmount);
        }

        require(baseShares >= baseMinShares && quoteShares >= quoteMinShares,"DODOV2Proxy01: Return DLP is not enough");
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
            IDODOApprove(_DODO_APPROVE_).claimTokens(token, from, to, amount);
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
            SafeERC20.safeTransfer(IERC20(token), to, amount);
        }
    }
}
