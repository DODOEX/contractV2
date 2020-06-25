/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {ReentrancyGuard} from "./lib/ReentrancyGuard.sol";
import {SafeERC20} from "./lib/SafeERC20.sol";
import {IDODO} from "./intf/IDODO.sol";
import {IDODOZoo} from "./intf/IDODOZoo.sol";
import {IERC20} from "./intf/IERC20.sol";
import {IWETH} from "./intf/IWETH.sol";


/**
 * @title DODO Eth Proxy
 * @author DODO Breeder
 *
 * @notice Handle ETH-WETH converting for users
 */
contract DODOEthProxy is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public _DODO_ZOO_;
    address payable public _WETH_;

    // ============ Events ============

    event ProxySellEth(
        address indexed seller,
        address indexed quoteToken,
        uint256 payEth,
        uint256 receiveQuote
    );

    event ProxyBuyEth(
        address indexed buyer,
        address indexed quoteToken,
        uint256 receiveEth,
        uint256 payQuote
    );

    event ProxyDepositEth(address indexed lp, address indexed quoteToken, uint256 ethAmount);

    // ============ Functions ============

    constructor(address dodoZoo, address payable weth) public {
        _DODO_ZOO_ = dodoZoo;
        _WETH_ = weth;
    }

    fallback() external payable {
        require(msg.sender == _WETH_, "WE_SAVED_YOUR_ETH_:)");
    }

    receive() external payable {
        require(msg.sender == _WETH_, "WE_SAVED_YOUR_ETH_:)");
    }

    function sellEthTo(
        address quoteTokenAddress,
        uint256 ethAmount,
        uint256 minReceiveTokenAmount
    ) external payable preventReentrant returns (uint256 receiveTokenAmount) {
        require(msg.value == ethAmount, "ETH_AMOUNT_NOT_MATCH");
        address DODO = IDODOZoo(_DODO_ZOO_).getDODO(_WETH_, quoteTokenAddress);
        receiveTokenAmount = IDODO(DODO).querySellBaseToken(ethAmount);
        require(receiveTokenAmount >= minReceiveTokenAmount, "RECEIVE_NOT_ENOUGH");
        IWETH(_WETH_).deposit{value: ethAmount}();
        IWETH(_WETH_).approve(DODO, ethAmount);
        IDODO(DODO).sellBaseToken(ethAmount, minReceiveTokenAmount);
        _transferOut(quoteTokenAddress, msg.sender, receiveTokenAmount);
        emit ProxySellEth(msg.sender, quoteTokenAddress, ethAmount, receiveTokenAmount);
        return receiveTokenAmount;
    }

    function buyEthWith(
        address quoteTokenAddress,
        uint256 ethAmount,
        uint256 maxPayTokenAmount
    ) external preventReentrant returns (uint256 payTokenAmount) {
        address DODO = IDODOZoo(_DODO_ZOO_).getDODO(_WETH_, quoteTokenAddress);
        payTokenAmount = IDODO(DODO).queryBuyBaseToken(ethAmount);
        require(payTokenAmount <= maxPayTokenAmount, "PAY_TOO_MUCH");
        _transferIn(quoteTokenAddress, msg.sender, payTokenAmount);
        IERC20(quoteTokenAddress).approve(DODO, payTokenAmount);
        IDODO(DODO).buyBaseToken(ethAmount, maxPayTokenAmount);
        IWETH(_WETH_).withdraw(ethAmount);
        msg.sender.transfer(ethAmount);
        emit ProxyBuyEth(msg.sender, quoteTokenAddress, ethAmount, payTokenAmount);
        return payTokenAmount;
    }

    function depositEth(uint256 ethAmount, address quoteTokenAddress)
        external
        payable
        preventReentrant
    {
        require(msg.value == ethAmount, "ETH_AMOUNT_NOT_MATCH");
        address DODO = IDODOZoo(_DODO_ZOO_).getDODO(_WETH_, quoteTokenAddress);
        IWETH(_WETH_).deposit{value: ethAmount}();
        IWETH(_WETH_).approve(DODO, ethAmount);
        IDODO(DODO).depositBaseTo(msg.sender, ethAmount);
        emit ProxyDepositEth(msg.sender, quoteTokenAddress, ethAmount);
    }

    // ============ Helper Functions ============

    function _transferIn(
        address tokenAddress,
        address from,
        uint256 amount
    ) internal {
        IERC20(tokenAddress).safeTransferFrom(from, address(this), amount);
    }

    function _transferOut(
        address tokenAddress,
        address to,
        uint256 amount
    ) internal {
        IERC20(tokenAddress).safeTransfer(to, amount);
    }
}
