
/*
    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;

import {IDODOApproveProxy} from "../DODOApproveProxy.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IWETH} from "../../intf/IWETH.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";

interface IDODOMysteryBox {
    function _BUY_TOKEN_() external view returns (address);
    function _FEE_MODEL_() external view returns (address);
    function getPriceAndSellAmount() external view returns (uint256, uint256, uint256);
    function buyTickets(address assetTo, uint256 ticketAmount) external;
}

interface IMysteryBoxPay {
    function getPayAmount(address mysteryBox, address user, uint256 originalPrice, uint256 ticketAmount) external view returns (uint256, uint256);
}

/**
 * @title DODO MysteryBoxProxy
 * @author DODO Breeder
 *
 * @notice Entrance of MysteryBox in DODO platform
 */
contract DODOMysteryBoxProxy is ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;

    // ============ Events ============
    event BuyTicket(address indexed account, address indexed mysteryBox, uint256 ticketAmount);

    fallback() external payable {}

    receive() external payable {}

    constructor(
        address payable weth,
        address dodoApproveProxy
    ) public {
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }

    function buyTickets(address payable dodoMysteryBox, uint256 ticketAmount) external payable preventReentrant {
        (uint256 curPrice, uint256 sellAmount,) = IDODOMysteryBox(dodoMysteryBox).getPriceAndSellAmount();
        require(curPrice > 0 && sellAmount > 0, "CAN_NOT_BUY");
        require(ticketAmount <= sellAmount, "TICKETS_NOT_ENOUGH");

        address feeModel = IDODOMysteryBox(dodoMysteryBox)._FEE_MODEL_();
        (uint256 payAmount,) = IMysteryBoxPay(feeModel).getPayAmount(dodoMysteryBox, msg.sender, curPrice, ticketAmount);
        require(payAmount > 0, "UnQualified");
        address buyToken = IDODOMysteryBox(dodoMysteryBox)._BUY_TOKEN_();

        if(buyToken == _ETH_ADDRESS_) {
            require(msg.value >= payAmount, "PAYAMOUNT_NOT_ENOUGH");
            dodoMysteryBox.transfer(payAmount);
        }else {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(buyToken, msg.sender, dodoMysteryBox, payAmount);
        }

        IDODOMysteryBox(dodoMysteryBox).buyTickets(msg.sender, ticketAmount);

        emit BuyTicket(msg.sender, dodoMysteryBox, ticketAmount);
    } 
}