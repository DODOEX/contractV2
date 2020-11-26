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
    // shares [round down]
    function buyShares(address to)
        external
        preventReentrant
        returns (
            uint256 shares,
            uint256 baseAmount,
            uint256 quoteAmount
        )
    {
        uint256 baseInput = getBaseInput();
        uint256 quoteInput = getQuoteInput();
        require(baseInput > 0, "NO_BASE_INPUT");
        uint256 baseReserve = _BASE_RESERVE_;
        uint256 quoteReserve = _QUOTE_RESERVE_;
        // case 1. initial supply
        // 包含了 baseReserve == 0 && quoteReserve == 0 的情况
        // 在提币的时候向下取整。因此永远不会出现，balance为0但totalsupply不为0的情况
        // 但有可能出现，reserve>0但totalSupply=0的场景
        if (totalSupply == 0) {
            shares = getBaseBalance(); // 以免出现balance很大但shares很小的情况
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
        _sync();
        return (shares, baseInput, quoteInput);
    }

    // withdraw amount [round down]
    function sellShares(
        uint256 shareAmount,
        address to,
        bytes calldata data
    ) external preventReentrant returns (uint256 baseAmount, uint256 quoteAmount) {
        (uint256 baseBalance, uint256 quoteBalance) = getVaultBalance();
        uint256 totalShares = totalSupply;
        require(shareAmount <= _SHARES_[msg.sender], "DLP_NOT_ENOUGH");
        baseAmount = baseBalance.mul(shareAmount).div(totalShares);
        quoteAmount = quoteBalance.mul(shareAmount).div(totalShares);
        _burn(msg.sender, shareAmount);
        _transferBaseOut(to, baseAmount);
        _transferQuoteOut(to, quoteAmount);
        if (data.length > 0) {
            IDODOCallee(to).DVMSellShareCall(
                msg.sender,
                shareAmount,
                baseAmount,
                quoteAmount,
                data
            );
        }
        _sync();
    }
}
