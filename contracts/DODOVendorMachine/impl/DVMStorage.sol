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
<<<<<<< HEAD
import {IExternalValue} from "../../lib/ExternalValue.sol";
import {IFeeRateModel} from "../../intf/IFeeRateModel.sol";
import {IERC20} from "../../intf/IERC20.sol";
=======
import {IGasPriceSource} from "../../lib/GasPriceSource.sol";
import {IFeeRateModel} from "../../intf/IFeeRateModel.sol";
import {IDVMVault} from "../intf/IDVMVault.sol";
>>>>>>> bd21a14b5398693ec5ad47e52fed6a8ea1193e9b

contract DVMStorage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Variables for Control ============

<<<<<<< HEAD
    IExternalValue public _GAS_PRICE_LIMIT_;
=======
    IGasPriceSource public _GAS_PRICE_LIMIT_;
>>>>>>> bd21a14b5398693ec5ad47e52fed6a8ea1193e9b

    // ============ Advanced Controls ============

    bool public _BUYING_CLOSE_;
    bool public _SELLING_CLOSE_;

    IPermissionManager public _TRADE_PERMISSION_;

    // ============ Core Address ============

    address public _MAINTAINER_; // collect maintainer fee

<<<<<<< HEAD
    IERC20 public _BASE_TOKEN_;
    IERC20 public _QUOTE_TOKEN_;

    uint256 public _BASE_RESERVE_;
    uint256 public _QUOTE_RESERVE_;

    // ============ Shares ============

    string public symbol;
    uint256 public decimals;
    string public name;

    uint256 public totalSupply;
    mapping(address => uint256) internal _SHARES_;
    mapping(address => mapping(address => uint256)) internal _ALLOWED_;
=======
    address public _BASE_TOKEN_;
    address public _QUOTE_TOKEN_;
>>>>>>> bd21a14b5398693ec5ad47e52fed6a8ea1193e9b

    // ============ Variables for Pricing ============

    IFeeRateModel public _LP_FEE_RATE_MODEL_;
    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    uint256 public _K_;
    uint256 public _I_;

<<<<<<< HEAD
=======
    IDVMVault public _VAULT_;

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

    modifier limitGasPrice() {
        require(tx.gasprice <= _GAS_PRICE_LIMIT_.getGasPrice(), "GAS_PRICE_EXCEED");
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

>>>>>>> bd21a14b5398693ec5ad47e52fed6a8ea1193e9b
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

    function setGasPriceSource(address newGasPriceLimitSource) external onlyOwner {
<<<<<<< HEAD
        _GAS_PRICE_LIMIT_ = IExternalValue(newGasPriceLimitSource);
=======
        _GAS_PRICE_LIMIT_ = IGasPriceSource(newGasPriceLimitSource);
>>>>>>> bd21a14b5398693ec5ad47e52fed6a8ea1193e9b
    }

    function setBuy(bool open) external onlyOwner {
        _BUYING_CLOSE_ = !open;
    }

    function setSell(bool open) external onlyOwner {
        _SELLING_CLOSE_ = !open;
    }
}
