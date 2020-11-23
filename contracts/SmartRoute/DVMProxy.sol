/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDVM} from "../DODOVendingMachine/intf/IDVM.sol";
import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";

contract DVMProxy {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    //TODO: dodoSwap

    //TODO: externalSwap

    //TODO: createDVM

    //TODO: addLiquidityToDVM

    //TODO: removeLiquidityToDVM（待定）

    //TODO: createDPP

    //TODO: resetDPP

    //TODO: addLiquidityToClassical

    //TODO: removeLiquidityToClassical

    function sellBaseOnDVM(
        address DVMAddress,
        address to,
        uint256 baseAmount,
        uint256 minReceive
    ) public returns (uint256 receiveAmount) {
        IERC20(IDVM(DVMAddress)._BASE_TOKEN_()).safeTransferFrom(
            msg.sender,
            DVMAddress,
            baseAmount
        );
        receiveAmount = IDVM(DVMAddress).sellBase(to);
        require(receiveAmount >= minReceive, "RECEIVE_NOT_ENOUGH");
        return receiveAmount;
    }

    function sellQuoteOnDVM(
        address DVMAddress,
        address to,
        uint256 quoteAmount,
        uint256 minReceive
    ) public returns (uint256 receiveAmount) {
        IERC20(IDVM(DVMAddress)._QUOTE_TOKEN_()).safeTransferFrom(
            msg.sender,
            DVMAddress,
            quoteAmount
        );
        receiveAmount = IDVM(DVMAddress).sellQuote(to);
        require(receiveAmount >= minReceive, "RECEIVE_NOT_ENOUGU");
        return receiveAmount;
    }

    function depositToDVM(
        address DVMAddress,
        address to,
        uint256 baseAmount,
        uint256 quoteAmount
    ) public returns (uint256 shares) {
        uint256 adjustedBaseAmount;
        uint256 adjustedQuoteAmount;
        (uint256 baseReserve, uint256 quoteReserve) = IDVM(DVMAddress).getVaultReserve();

        if (quoteReserve == 0 && baseReserve == 0) {
            adjustedBaseAmount = baseAmount;
            adjustedQuoteAmount = quoteAmount;
        }

        if (quoteReserve == 0 && baseReserve > 0) {
            adjustedBaseAmount = baseAmount;
            adjustedQuoteAmount = 0;
        }

        if (quoteReserve > 0 && baseReserve > 0) {
            uint256 baseIncreaseRatio = DecimalMath.divFloor(baseAmount, baseReserve);
            uint256 quoteIncreaseRatio = DecimalMath.divFloor(quoteAmount, quoteReserve);
            if (baseIncreaseRatio <= quoteIncreaseRatio) {
                adjustedBaseAmount = baseAmount;
                adjustedQuoteAmount = DecimalMath.mulFloor(quoteReserve, baseIncreaseRatio);
            } else {
                adjustedQuoteAmount = quoteAmount;
                adjustedBaseAmount = DecimalMath.mulFloor(baseReserve, quoteIncreaseRatio);
            }
        }

        IERC20(IDVM(DVMAddress)._BASE_TOKEN_()).safeTransferFrom(
            msg.sender,
            DVMAddress,
            adjustedBaseAmount
        );
        IERC20(IDVM(DVMAddress)._QUOTE_TOKEN_()).safeTransferFrom(
            msg.sender,
            DVMAddress,
            adjustedQuoteAmount
        );

        shares = IDVM(DVMAddress).buyShares(to);

        return shares;
    }
}
