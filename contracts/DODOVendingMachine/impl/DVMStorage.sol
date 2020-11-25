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
import {IExternalValue} from "../../lib/ExternalValue.sol";
import {IFeeRateModel} from "../../lib/FeeRateModel.sol";
import {IERC20} from "../../intf/IERC20.sol";

contract DVMStorage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    address public _ADMIN_;

    // ============ Variables for Control ============

    IExternalValue public _GAS_PRICE_LIMIT_;

    // ============ Advanced Controls ============

    bool public _BUYING_CLOSE_;
    bool public _SELLING_CLOSE_;

    IPermissionManager public _TRADE_PERMISSION_;

    // ============ Core Address ============

    address public _MAINTAINER_; // collect maintainer fee

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

    // ============ Variables for Pricing ============

    IFeeRateModel public _LP_FEE_RATE_MODEL_;
    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    uint256 public _K_;
    uint256 public _I_;

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
        _GAS_PRICE_LIMIT_ = IExternalValue(newGasPriceLimitSource);
    }

    function setBuy(bool open) external onlyOwner {
        _BUYING_CLOSE_ = !open;
    }

    function setSell(bool open) external onlyOwner {
        _SELLING_CLOSE_ = !open;
    }

    // ============ View Functions ============

    function getLpFeeRate(address trader) external view returns (uint256 feeRate) {
        return _LP_FEE_RATE_MODEL_.getFeeRate(trader);
    }

    function getMtFeeRate(address trader) external view returns (uint256 feeRate) {
        return _MT_FEE_RATE_MODEL_.getFeeRate(trader);
    }
}
