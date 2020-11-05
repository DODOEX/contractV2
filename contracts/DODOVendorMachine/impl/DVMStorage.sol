/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DODOMath} from "../../lib/DODOMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IFeeRateModel} from "../../intf/IFeeRateModel.sol";
import {DVMVault} from "./DVMVault.sol";

contract DVMStorage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Variables for Control ============

    uint256 public _GAS_PRICE_LIMIT_;

    // ============ Advanced Controls ============

    bool public _BUYING_CLOSE_;
    bool public _SELLING_CLOSE_;

    IPermissionManager public _TRADE_PERMISSION_;

    // ============ Core Address ============

    address public _MAINTAINER_; // collect maintainer fee

    address public _BASE_TOKEN_;
    address public _QUOTE_TOKEN_;

    // ============ Variables for Pricing ============

    IFeeRateModel public _LP_FEE_RATE_MODEL_;
    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    uint256 public _K_;
    uint256 public _I_;

    DVMVault public _VAULT_;

    // ============ Modifiers ============

    modifier isBuyAllow(address trader) {
        require(!_BUYING_CLOSE_ && _TRADE_PERMISSION_.isAllowed(trader), "TRADER_BUY_NOT_ALLOWED");
        _;
    }

    modifier isSellAllow(address trader) {
        require(
            !_SELLING_CLOSE_ && _TRADE_PERMISSION_.isAllowed(trader),
            "TRADER_SELL_NOT_ALLOWED"
        );
        _;
    }

    // ============ Helper Functions ============

    function calculateBase0(uint256 baseAmount, uint256 quoteAmount) public view returns (uint256) {
        uint256 fairAmount = DecimalMath.divFloor(quoteAmount, _I_);
        return DODOMath._SolveQuadraticFunctionForTarget(baseAmount, _K_, fairAmount);
    }

    function getBase0() public view returns (uint256) {
        (uint256 baseAmount, uint256 quoteAmount) = _VAULT_.getVaultReserve();
        uint256 fairAmount = DecimalMath.divFloor(quoteAmount, _I_);
        return DODOMath._SolveQuadraticFunctionForTarget(baseAmount, _K_, fairAmount);
    }

    // ============ Setting Functions ============

    function setLpFeeRateModel(address newLpFeeRateModel) external onlyOwner {
        _LP_FEE_RATE_MODEL_ = IFeeRateModel(newLpFeeRateModel);
    }

    function setMtFeeRateModel(address newMtFeeRateModel) external onlyOwner {
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(newMtFeeRateModel);
    }

    function setTradePermissionManager(address newTradePermissionManager) external onlyOwner {
        _TRADE_PERMISSION_ = IPermissionManager(newTradePermissionManager);
    }

    function setMaintainer(address newMaintainer) external onlyOwner {
        _MAINTAINER_ = newMaintainer;
    }

    function setGasPriceLimit(uint256 newGasPriceLimit) external onlyOwner {
        _GAS_PRICE_LIMIT_ = newGasPriceLimit;
    }

    function setBuy(bool open) external onlyOwner {
        _BUYING_CLOSE_ = !open;
    }

    function setSell(bool open) external onlyOwner {
        _SELLING_CLOSE_ = !open;
    }
}
