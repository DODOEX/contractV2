/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOV2Proxy01} from "../SmartRoute/intf/IDODOV2Proxy01.sol";
import {IDODOV2} from "../SmartRoute/intf/IDODOV2.sol";
import {IDODOV1} from "../SmartRoute/intf/IDODOV1.sol";
import {IDODOApproveProxy} from "../DODOApproveProxy.sol";
import {IDODOSellHelper} from "../SmartRoute/helper/DODOSellHelper.sol";
import {IERC20} from "../intf/IERC20.sol";
import {IWETH} from "../intf/IWETH.sol";
import {IUni} from "../SmartRoute/intf/IUni.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {UniversalERC20} from "../SmartRoute/lib/UniversalERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {IDODOAdapter} from "../SmartRoute/intf/IDODOAdapter.sol";

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
        address payable weth,
        address dodoApproveProxy,
        address dodoSellHelper
    ) public {
        _DVM_FACTORY_ = dvmFactory;
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
        _DODO_SELL_HELPER_ = dodoSellHelper;
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


    //============ CrowdPooling Functions (bid) ============
    // function bid(
    //     address cpAddress,
    //     uint256 quoteAmount,
    //     uint8 flag, // 0 - ERC20, 1 - quoteInETH
    //     uint256 deadLine
    // ) external override payable preventReentrant judgeExpired(deadLine) {
    //     _deposit(msg.sender, cpAddress, IDODOV2(cpAddress)._QUOTE_TOKEN_(), quoteAmount, flag == 1);
    //     IDODOV2(cpAddress).bid(msg.sender);
    // }


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
                require(msg.value == amount, "ETH_VALUE_WRONG");
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
}
