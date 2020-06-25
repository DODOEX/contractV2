/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Storage} from "./Storage.sol";

/**
 * @title Admin
 * @author DODO Breeder
 *
 * @notice Functions for admin operations
 */
contract Admin is Storage {
    // ============ Events ============

    event UpdateGasPriceLimit(uint256 newGasPriceLimit);

    // ============ Params Setting Functions ============

    function setOracle(address newOracle) external onlyOwner {
        _ORACLE_ = newOracle;
    }

    function setSupervisor(address newSupervisor) external onlyOwner {
        _SUPERVISOR_ = newSupervisor;
    }

    function setMaintainer(address newMaintainer) external onlyOwner {
        _MAINTAINER_ = newMaintainer;
    }

    function setLiquidityProviderFeeRate(uint256 newLiquidityPorviderFeeRate) external onlyOwner {
        _LP_FEE_RATE_ = newLiquidityPorviderFeeRate;
        _checkDODOParameters();
    }

    function setMaintainerFeeRate(uint256 newMaintainerFeeRate) external onlyOwner {
        _MT_FEE_RATE_ = newMaintainerFeeRate;
        _checkDODOParameters();
    }

    function setK(uint256 newK) external onlyOwner {
        _K_ = newK;
        _checkDODOParameters();
    }

    function setGasPriceLimit(uint256 newGasPriceLimit) external onlySupervisorOrOwner {
        _GAS_PRICE_LIMIT_ = newGasPriceLimit;
        emit UpdateGasPriceLimit(newGasPriceLimit);
    }

    // ============ System Control Functions ============

    function disableTrading() external onlySupervisorOrOwner {
        _TRADE_ALLOWED_ = false;
    }

    function enableTrading() external onlyOwner notClosed {
        _TRADE_ALLOWED_ = true;
    }

    function disableQuoteDeposit() external onlySupervisorOrOwner {
        _DEPOSIT_QUOTE_ALLOWED_ = false;
    }

    function enableQuoteDeposit() external onlyOwner notClosed {
        _DEPOSIT_QUOTE_ALLOWED_ = true;
    }

    function disableBaseDeposit() external onlySupervisorOrOwner {
        _DEPOSIT_BASE_ALLOWED_ = false;
    }

    function enableBaseDeposit() external onlyOwner notClosed {
        _DEPOSIT_BASE_ALLOWED_ = true;
    }
}
