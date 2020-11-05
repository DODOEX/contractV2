/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IFeeRateModel} from "../../intf/IFeeRateModel.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {DVMTrader} from "./DVMTrader.sol";
import {DVMFunding} from "./DVMFunding.sol";
import {DVMVault} from "./DVMVault.sol";

contract DVM is DVMTrader, DVMFunding {
    function init(
        address owner,
        address maintainer,
        address vault,
        address lpFeeRateModel,
        address mtFeeRateModel,
        address tradePermissionManager,
        uint256 i,
        uint256 k
    ) external {
        initOwner(owner);
        _VAULT_ = DVMVault(vault);
        _BASE_TOKEN_ = _VAULT_._BASE_TOKEN_();
        _QUOTE_TOKEN_ = _VAULT_._QUOTE_TOKEN_();
        _LP_FEE_RATE_MODEL_ = IFeeRateModel(lpFeeRateModel);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(mtFeeRateModel);
        _TRADE_PERMISSION_ = IPermissionManager(tradePermissionManager);
        _MAINTAINER_ = maintainer;
        _I_ = i;
        _K_ = k;
        _GAS_PRICE_LIMIT_ = uint256(-1);
    }

    // ============ Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
