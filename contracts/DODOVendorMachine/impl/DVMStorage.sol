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

    bool public _CLOSED_;
    uint256 public _GAS_PRICE_LIMIT_;

    // ============ Advanced Controls ============

    bool public _BUYING_ALLOWED_;
    bool public _SELLING_ALLOWED_;

    IPermissionManager public _TRADE_PERMISSION_;
    IPermissionManager public _FUNDING_PERMISSION_;

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

    modifier notClosed() {
        require(!_CLOSED_, "DODO_CLOSED");
        _;
    }

    // ============ Helper Functions ============

    function getBase0(uint256 baseAmount, uint256 quoteAmount) public view returns (uint256) {
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

    function setFundingPermissionManager(address newFundingPermissionManager) external onlyOwner {
        _FUNDING_PERMISSION_ = IPermissionManager(newFundingPermissionManager);
    }

    function setMaintainer(address newMaintainer) external onlyOwner {
        _MAINTAINER_ = newMaintainer;
    }
}
