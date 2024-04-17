/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DVMVault} from "./DVMVault.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IDODOCallee} from "../../intf/IDODOCallee.sol";

contract DVMFunding is DVMVault {
    // ============ Events ============

    event BuyShares(address to, uint256 increaseShares, uint256 totalShares);

    event SellShares(address payer, address to, uint256 decreaseShares, uint256 totalShares);

    // ============ Buy & Sell Shares ============

    // buy shares [round down]
    function buyShares(address to)
        external
        preventReentrant
        returns (
            uint256 shares,
            uint256 baseInput,
            uint256 quoteInput
        )
    {
        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        uint256 baseReserve = _BASE_RESERVE_;
        uint256 quoteReserve = _QUOTE_RESERVE_;

        baseInput = baseBalance.sub(baseReserve);
        quoteInput = quoteBalance.sub(quoteReserve);
        require(baseInput > 0, "NO_BASE_INPUT");

        // Round down when withdrawing. Therefore, never be a situation occuring balance is 0 but totalsupply is not 0
        // But May Happen，reserve >0 But totalSupply = 0
        if (totalSupply == 0) {
            // case 1. initial supply
            shares = baseBalance; // 以免出现balance很大但shares很小的情况
            require(shares > 2001, "MINT_AMOUNT_NOT_ENOUGH");
            _mint(address(0), 1001);
            shares -= 1001;
        } else if (baseReserve > 0 && quoteReserve == 0) {
            // case 2. supply when quote reserve is 0
            shares = baseInput.mul(totalSupply).div(baseReserve);
        } else if (baseReserve > 0 && quoteReserve > 0) {
            // case 3. normal case
            uint256 baseInputRatio = DecimalMath.divFloor(baseInput, baseReserve);
            uint256 quoteInputRatio = DecimalMath.divFloor(quoteInput, quoteReserve);
            uint256 mintRatio = quoteInputRatio < baseInputRatio ? quoteInputRatio : baseInputRatio;
            shares = DecimalMath.mulFloor(totalSupply, mintRatio);
        }
        _mint(to, shares);
        _setReserve(baseBalance, quoteBalance);
        emit BuyShares(to, shares, _SHARES_[to]);
    }

    // sell shares [round down]
    function sellShares(
        uint256 shareAmount,
        address to,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        bytes calldata data,
        uint256 deadline
    ) external preventReentrant returns (uint256 baseAmount, uint256 quoteAmount) {
        require(deadline >= block.timestamp, "TIME_EXPIRED");
        require(shareAmount <= _SHARES_[msg.sender], "DLP_NOT_ENOUGH");
        require(to != address(this), "SELL_BACK_NOT_ALLOWED");
        uint256 baseBalance = _BASE_TOKEN_.balanceOf(address(this));
        uint256 quoteBalance = _QUOTE_TOKEN_.balanceOf(address(this));
        uint256 totalShares = totalSupply;

        baseAmount = baseBalance.mul(shareAmount).div(totalShares);
        quoteAmount = quoteBalance.mul(shareAmount).div(totalShares);

        require(
            baseAmount >= baseMinAmount && quoteAmount >= quoteMinAmount,
            "WITHDRAW_NOT_ENOUGH"
        );

        _burn(msg.sender, shareAmount);
        _transferBaseOut(to, baseAmount);
        _transferQuoteOut(to, quoteAmount);
        _sync();

        if (data.length > 0) {
            IDODOCallee(to).DVMSellShareCall(
                msg.sender,
                shareAmount,
                baseAmount,
                quoteAmount,
                data
            );
        }

        emit SellShares(msg.sender, to, shareAmount, _SHARES_[msg.sender]);
    }
}
