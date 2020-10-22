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
import {PermissionManager} from "../../lib/PermissionManager.sol";
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

    PermissionManager public _TRADE_PERMISSION_;
    PermissionManager public _FUNDING_PERMISSION_;

    // ============ Core Address ============

    address public _MAINTAINER_; // collect maintainer fee

    address public _BASE_TOKEN_;
    address public _QUOTE_TOKEN_;

    // ============ Variables for Pricing ============

    IFeeRateModel public _LP_FEE_RATE_MODEL_;
    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    uint256 public _K_;
    uint256 public _I_;
    uint256 public _BASE0_;

    DVMVault public _VAULT_;
    DVMVault public _PROTECTION_VAULT_;

    // ============ Modifiers ============

    modifier notClosed() {
        require(!_CLOSED_, "DODO_CLOSED");
        _;
    }

    // ============ Helper Functions ============
    function _updateBase0() internal {
        uint256 fairAmount = DecimalMath.divFloor(_VAULT_._QUOTE_RESERVE_(), _I_);
        _BASE0_ = DODOMath._SolveQuadraticFunctionForTarget(
            _VAULT_._BASE_RESERVE_(),
            _K_,
            fairAmount
        );
    }

    // ============ Version Control ============
    function version() external pure returns (uint256) {
        return 101; // 1.0.1
    }
}
