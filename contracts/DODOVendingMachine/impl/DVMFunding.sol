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
    function buyShares(address to) external preventReentrant returns (uint256 shares,uint256 baseAmount,uint256 quoteAmount) {
        uint256 baseInput = getBaseInput();
        uint256 quoteInput = getQuoteInput();
        require(baseInput > 0, "NO_BASE_INPUT");
        uint256 baseReserve = _BASE_RESERVE_;
        uint256 quoteReserve = _QUOTE_RESERVE_;
        uint256 mintAmount;
        // case 1. initial supply
        if (baseReserve == 0 && quoteReserve == 0) {
            mintAmount = baseInput;
        }
        // case 2. supply when quote reserve is 0
        if (baseReserve > 0 && quoteReserve == 0) {
            uint256 mintRatio = DecimalMath.divFloor(baseInput, baseReserve);
            mintAmount = DecimalMath.mulFloor(totalSupply, mintRatio);
        }
        // case 3. normal case
        if (baseReserve > 0 && quoteReserve > 0) {
            uint256 baseInputRatio = DecimalMath.divFloor(baseInput, baseReserve);
            uint256 quoteInputRatio = DecimalMath.divFloor(quoteInput, quoteReserve);
            uint256 mintRatio;
            if(baseInputRatio > quoteInputRatio){
                mintRatio = quoteInputRatio;
                baseInput = DecimalMath.mulFloor(baseInput, mintRatio);
            }else {
                mintRatio = baseInputRatio;
                quoteInput = DecimalMath.mulFloor(quoteInput, mintRatio);
            }
            // 在提币的时候向下取整。因此永远不会出现，balance为0但totalsupply不为0的情况
            // 但有可能出现，reserve>0但totalSupply=0的场景
            uint256 totalShare = totalSupply;
            if (totalShare > 0) {
                mintAmount = DecimalMath.mulFloor(totalShare, mintRatio);
            } else {
                mintAmount = baseInput;
            }
        }
        _mint(to, mintAmount);
        _sync();
        return (mintAmount,baseInput,quoteInput);
    }

    function sellShares(address to) external preventReentrant returns (uint256 baseAmount,uint256 quoteAmount) {
        (uint256 baseBalance, uint256 quoteBalance) = getVaultBalance();
        uint256 totalShares = totalSupply;
        uint256 shareAmount = _SHARES_[address(this)];
        baseAmount = baseBalance.mul(shareAmount).div(totalShares);
        quoteAmount = quoteBalance.mul(shareAmount).div(totalShares);
        require(baseAmount > 0 && quoteAmount > 0, 'NO_DLP_INPUT');
        _burn(address(this), shareAmount);
        _transferBaseOut(to, baseAmount);
        _transferQuoteOut(to, quoteAmount);
        _sync();
    }
}
