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

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address payable public _WETH_;
    address public dodoApprove;
    address public dodoSellHelper;
    address public dvmFactory;
    address public dppFactory;

    // ============ Events ============

    event OrderHistory(
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 fromAmount,
        uint256 returnAmount,
        uint256 timeStamp
    );

    // ============ Modifiers ============

    modifier judgeExpired(uint256 deadline) {
        require(deadline >= block.timestamp, "DODOV2Proxy01: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

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
        uint256 deadline
    )
        external
        virtual
        override
        payable
        preventReentrant
        judgeExpired(deadline)
        returns (address newVendingMachine, uint256 shares)
    {
        {
            address _baseToken = baseToken == ETH_ADDRESS ? _WETH_ : baseToken;
            address _quoteToken = quoteToken == ETH_ADDRESS ? _WETH_ : quoteToken;
            newVendingMachine = IDODOV2(dvmFactory).createDODOVendingMachine(
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
                _baseToken == ETH_ADDRESS
            );
            _deposit(
                msg.sender,
                newVendingMachine,
                _quoteToken,
                quoteInAmount,
                _quoteToken == ETH_ADDRESS
            );
        }

        (shares, , ) = IDODOV2(newVendingMachine).buyShares(assetTo);
    }

    function addDVMLiquidity(
        address DVMAddress,
        address to,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint8 flag, // 0 - ERC20, 1 - baseInETH, 2 - quoteInETH
        uint256 deadline
    )
        external
        virtual
        override
        payable
        preventReentrant
        judgeExpired(deadline)
        returns (
            uint256 shares,
            uint256 baseAdjustedInAmount,
            uint256 quoteAdjustedInAmount
        )
    {
        (baseAdjustedInAmount, quoteAdjustedInAmount) = _addDVMLiquidity(
            DVMAddress,
            baseInAmount,
            quoteInAmount
        );
        require(
            baseAdjustedInAmount >= baseMinAmount && quoteAdjustedInAmount >= quoteMinAmount,
            "DODOV2Proxy01: deposit amount is not enough"
        );
        address _dvm = DVMAddress;

        _deposit(msg.sender, _dvm, IDODOV2(_dvm)._BASE_TOKEN_(), baseAdjustedInAmount, flag == 1);
        _deposit(msg.sender, _dvm, IDODOV2(_dvm)._QUOTE_TOKEN_(), quoteAdjustedInAmount, flag == 2);

        (shares, , ) = IDODOV2(_dvm).buyShares(to);
    }

    function _addDVMLiquidity(
        address DVMAddress,
        uint256 baseInAmount,
        uint256 quoteInAmount
    ) internal virtual view returns (uint256 baseAdjustedInAmount, uint256 quoteAdjustedInAmount) {
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
        uint256 deadline
    )
        external
        virtual
        override
        payable
        preventReentrant
        judgeExpired(deadline)
        returns (address newPrivatePool)
    {
        newPrivatePool = IDODOV2(dppFactory).createDODOPrivatePool();

        address _baseToken = baseToken;
        address _quoteToken = quoteToken;
        _deposit(msg.sender, newPrivatePool, _baseToken, baseInAmount, _baseToken == ETH_ADDRESS);
        _deposit(
            msg.sender,
            newPrivatePool,
            _quoteToken,
            quoteInAmount,
            _quoteToken == ETH_ADDRESS
        );

        if (_baseToken == ETH_ADDRESS) _baseToken = _WETH_;
        if (_quoteToken == ETH_ADDRESS) _quoteToken = _WETH_;

        IDODOV2(dppFactory).initDODOPrivatePool(
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
        address DPPAddress,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint8 flag, // 0 - ERC20, 1 - baseInETH, 2 - quoteInETH, 3 - baseOutETH, 4 - quoteOutETH
        uint256 deadline
    ) external virtual override payable preventReentrant judgeExpired(deadline) {
        _deposit(
            msg.sender,
            DPPAddress,
            IDODOV2(DPPAddress)._BASE_TOKEN_(),
            baseInAmount,
            flag == 1
        );
        _deposit(
            msg.sender,
            DPPAddress,
            IDODOV2(DPPAddress)._QUOTE_TOKEN_(),
            quoteInAmount,
            flag == 2
        );

        IDODOV2(IDODOV2(DPPAddress)._OWNER_()).reset(
            msg.sender,
            newLpFeeRate,
            newMtFeeRate,
            newI,
            newK,
            baseOutAmount,
            quoteOutAmount
        );

        _withdraw(msg.sender, IDODOV2(DPPAddress)._BASE_TOKEN_(), baseOutAmount, flag == 3);
        _withdraw(msg.sender, IDODOV2(DPPAddress)._QUOTE_TOKEN_(), quoteOutAmount, flag == 4);
    }

    // ============ Swap ============

    function dodoSwapETHToToken(
        address payable assetTo,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadline
    )
        external
        virtual
        override
        payable
        preventReentrant
        judgeExpired(deadline)
        returns (uint256 returnAmount)
    {
        uint256 originToTokenBalance = IERC20(toToken).balanceOf(msg.sender);

        require(msg.value == fromTokenAmount, "DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH");
        IWETH(_WETH_).deposit{value: fromTokenAmount}();
        IWETH(_WETH_).transfer(dodoPairs[0], fromTokenAmount);

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
            ETH_ADDRESS,
            toToken,
            assetTo,
            fromTokenAmount,
            returnAmount,
            block.timestamp
        );
    }

    function dodoSwapTokenToETH(
        address payable assetTo,
        address fromToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadline
    )
        external
        virtual
        override
        preventReentrant
        judgeExpired(deadline)
        returns (uint256 returnAmount)
    {
        IDODOApprove(dodoApprove).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

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
            ETH_ADDRESS,
            assetTo,
            fromTokenAmount,
            returnAmount,
            block.timestamp
        );
    }

    function dodoSwapTokenToToken(
        address payable assetTo,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadline
    )
        external
        virtual
        override
        preventReentrant
        judgeExpired(deadline)
        returns (uint256 returnAmount)
    {
        uint256 originToTokenBalance = IERC20(toToken).balanceOf(msg.sender);
        IDODOApprove(dodoApprove).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);

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
            returnAmount,
            block.timestamp
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
        uint256 deadline
    )
        external
        virtual
        override
        payable
        preventReentrant
        judgeExpired(deadline)
        returns (uint256 returnAmount)
    {
        if (fromToken != ETH_ADDRESS) {
            IDODOApprove(dodoApprove).claimTokens(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
            IERC20(fromToken).universalApproveMax(approveTarget, fromTokenAmount);
        }

        (bool success, ) = to.call{value: fromToken == ETH_ADDRESS ? msg.value : 0}(callDataConcat);

        require(success, "DODOV2Proxy01: Contract Swap execution Failed");

        IERC20(fromToken).universalTransfer(
            msg.sender,
            IERC20(fromToken).universalBalanceOf(address(this))
        );

        returnAmount = IERC20(toToken).universalBalanceOf(address(this));
        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");
        IERC20(toToken).universalTransfer(msg.sender, returnAmount);

        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount,
            block.timestamp
        );
    }

    function dodoSwap(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint8[] memory directions,
        uint256 deadline
    )
        external
        virtual
        override
        payable
        preventReentrant
        judgeExpired(deadline)
        returns (uint256 returnAmount)
    {
        _deposit(msg.sender, address(this), fromToken, fromTokenAmount, fromToken == ETH_ADDRESS);

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
                uint256 canBuyBaseAmount = IDODOSellHelper(dodoSellHelper).querySellQuoteToken(
                    curDodoPair,
                    curAmountIn
                );
                IDODOV1(curDodoPair).buyBaseToken(canBuyBaseAmount, curAmountIn, "");
            }
        }

        returnAmount = IERC20(toToken).universalBalanceOf(address(this));
        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");

        _withdraw(msg.sender, toToken, returnAmount, toToken == ETH_ADDRESS);

        emit OrderHistory(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount,
            block.timestamp
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
            IDODOApprove(dodoApprove).claimTokens(token, from, to, amount);
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
