/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {Ownable} from "../lib/Ownable.sol";
import {DVMController} from "../DODOVenderMachine/impl/DVMController.sol";
import {DVMVault} from "../DODOVenderMachine/impl/DVMVault.sol";
import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";

contract SmartRoute is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    function sellBaseOnDVM(
        address DVM,
        address to,
        uint256 baseAmount,
        uint256 minReceive
    ) public returns (uint256 receiveAmount) {
        IERC20(DVMController(DVM)._BASE_TOKEN_()).safeTransferFrom(
            msg.sender,
            address(DVMController(DVM)._VAULT_()),
            baseAmount
        );
        receiveAmount = DVMController(DVM).sellBase(to);
        require(receiveAmount >= minReceive, "RECEIVE_NOT_ENOUGH");
        return receiveAmount;
    }

    function sellQuoteOnDVM(
        address DVM,
        address to,
        uint256 quoteAmount,
        uint256 minReceive
    ) public returns (uint256 receiveAmount) {
        IERC20(DVMController(DVM)._QUOTE_TOKEN_()).safeTransferFrom(
            msg.sender,
            address(DVMController(DVM)._VAULT_()),
            quoteAmount
        );
        receiveAmount = DVMController(DVM).sellBase(to);
        require(receiveAmount >= minReceive, "RECEIVE_NOT_ENOUGU");
        return receiveAmount;
    }

    function depositToDVM(
        address DVM,
        address to,
        uint256 baseAmount,
        uint256 quoteAmount
    ) public returns (uint256 shares) {
        address vault = address(DVMController(DVM)._VAULT_());
        uint256 adjustedBaseAmount;
        uint256 adjustedQuoteAmount;
        (uint256 baseReserve, uint256 quoteReserve) = DVMController(DVM)
            ._VAULT_()
            .getVaultReserve();

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

        IERC20(DVMController(DVM)._BASE_TOKEN_()).safeTransferFrom(
            msg.sender,
            vault,
            adjustedBaseAmount
        );
        IERC20(DVMController(DVM)._QUOTE_TOKEN_()).safeTransferFrom(
            msg.sender,
            vault,
            adjustedQuoteAmount
        );

        return DVMController(DVM).buyShares(to);
    }
}
