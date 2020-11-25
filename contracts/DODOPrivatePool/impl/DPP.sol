/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IFeeRateModel} from "../../lib/FeeRateModel.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IExternalValue} from "../../lib/ExternalValue.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {DPPTrader} from "./DPPTrader.sol";

contract DPP is DPPTrader {
    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        address lpFeeRateModel,
        address mtFeeRateModel,
        address kSource,
        address iSource,
        address gasPriceSource,
        address dodoSmartApprove,
        address tradePermissionManager
    ) external {
        initOwner(owner);
        _MAINTAINER_ = maintainer;
        _BASE_TOKEN_ = IERC20(baseTokenAddress);
        _QUOTE_TOKEN_ = IERC20(quoteTokenAddress);
        _LP_FEE_RATE_MODEL_ = IFeeRateModel(lpFeeRateModel);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(mtFeeRateModel);
        _I_ = IExternalValue(iSource);
        _K_ = IExternalValue(kSource);
        _GAS_PRICE_LIMIT_ = IExternalValue(gasPriceSource);
        _TRADE_PERMISSION_ = IPermissionManager(tradePermissionManager);
        _DODO_SMART_APPROVE_ = dodoSmartApprove;
        _resetTargetAndReserve();
    }

    // ============ Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
