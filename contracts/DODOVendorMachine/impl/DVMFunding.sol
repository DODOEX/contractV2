/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DVMStorage} from "./DVMStorage.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IDODOCallee} from "../../intf/IDODOCallee.sol";

contract DVMFunding is DVMStorage {
    function buyShares(address to) external preventReentrant returns (uint256) {
        uint256 baseInput = _VAULT_.getBaseInput();
        uint256 quoteInput = _VAULT_.getQuoteInput();
        require(baseInput > 0, "NO_BASE_INPUT");
        uint256 baseReserve = _VAULT_._BASE_RESERVE_();
        uint256 quoteReserve = _VAULT_._QUOTE_RESERVE_();
        uint256 mintAmount;
        // case 1. initial supply
        if (baseReserve == 0 && quoteReserve == 0) {
            mintAmount = baseInput;
        }
        // case 2. supply when quote reserve is 0
        if (baseReserve > 0 && quoteReserve == 0) {
            uint256 mintRatio = DecimalMath.divFloor(baseInput, baseReserve);
            mintAmount = DecimalMath.mulFloor(_VAULT_.totalSupply(), mintRatio);
        }
        // case 3. normal case
        if (baseReserve > 0 && quoteReserve > 0) {
            uint256 baseInputRatio = DecimalMath.divFloor(baseInput, baseReserve);
            uint256 quoteInputRatio = DecimalMath.divFloor(quoteInput, quoteReserve);
            uint256 mintRatio = baseInputRatio > quoteInputRatio ? quoteInputRatio : baseInputRatio;
            // 在提币的时候向下取整。因此永远不会出现，balance为0但totalsupply不为0的情况
            // 但有可能出现，reserve>0但totalSupply=0的场景
            uint256 totalShare = _VAULT_.totalSupply();
            if (totalShare > 0) {
                mintAmount = DecimalMath.mulFloor(totalShare, mintRatio);
            } else {
                mintAmount = baseInput;
            }
        }
        _VAULT_.mint(to, mintAmount);
        _VAULT_.sync();
    }

    function sellShares(
        address to,
        uint256 shareAmount,
        bytes calldata data
    ) external preventReentrant returns (uint256) {
        require(_VAULT_.balanceOf(msg.sender) >= shareAmount, "SHARES_NOT_ENOUGH");
        (uint256 baseBalance, uint256 quoteBalance) = _VAULT_.getVaultBalance();
        uint256 totalShares = _VAULT_.totalSupply();
        _VAULT_.burn(msg.sender, shareAmount);
        uint256 baseAmount = baseBalance.mul(shareAmount).div(totalShares);
        uint256 quoteAmount = quoteBalance.mul(shareAmount).div(totalShares);
        _VAULT_.transferBaseOut(to, baseAmount);
        _VAULT_.transferQuoteOut(to, quoteAmount);
        _VAULT_.sync();
        if (data.length > 0) IDODOCallee(to, shareAmount, baseAmount, quoteAmount, data);
    }

    function retrieve(address to) external preventReentrant {
        (uint256 baseBalance, uint256 quoteBalance) = _VAULT_.getVaultBalance();
        (uint256 baseReserve, uint256 quoteReserve) = _VAULT_.getVaultReserve();
        if (baseBalance.sub(baseReserve) > 0) {
            _VAULT_.transferBaseOut(to, baseBalance.sub(baseReserve));
        }
        if (quoteBalance.sub(quoteReserve) > 0) {
            _VAULT_.transferQuoteOut(to, quoteBalance.sub(quoteReserve));
        }
    }
}
