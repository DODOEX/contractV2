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
    function _TICKET_() external view returns (address);
    function redeemPrize(address to) external;
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
    event RedeemPrize(address indexed account, address indexed mysteryBox, uint256 ticketAmount);

    fallback() external payable {}

    receive() external payable {}

    constructor(
        address payable weth,
        address dodoApproveProxy
    ) public {
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }

    function redeemPrize(
        address dodoMysteryBox,
        uint256 ticketAmount,
        uint8 flag // 0 - ERC20, 1 - quoteInETH
    ) external payable preventReentrant {
        _deposit(msg.sender, dodoMysteryBox, IDODOMysteryBox(dodoMysteryBox)._TICKET_(), ticketAmount, flag == 1);
        IDODOMysteryBox(dodoMysteryBox).redeemPrize(msg.sender);
        emit RedeemPrize(msg.sender, dodoMysteryBox, ticketAmount);
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
}
