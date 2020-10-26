/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DVMStorage} from "./DVMStorage.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";

contract DVMFunding is DVMStorage {
    function buyShares(address account) external returns (uint256) {
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
        _VAULT_.mint(account, mintAmount);
        _VAULT_.sync();
    }

    function sellShares(
        address account,
        address to,
        uint256 amount
    ) external returns (uint256) {
        require(msg.sender == account, "PERMISSION_DENY");
        require(_VAULT_.balanceOf(account) >= amount, "SHARES_NOT_ENOUGH");
        (uint256 baseBalance, uint256 quoteBalance) = _VAULT_.getVaultBalance();
        uint256 totalShares = _VAULT_.totalSupply();
        _VAULT_.burn(account, amount);
        _VAULT_.transferBaseOut(to, baseBalance.mul(amount).div(totalShares));
        _VAULT_.transferQuoteOut(to, quoteBalance.mul(amount).div(totalShares));
        _VAULT_.sync();
    }
}
