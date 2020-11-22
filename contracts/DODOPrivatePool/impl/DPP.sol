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
import {ISmartApprove} from "../../intf/ISmartApprove.sol";

contract DPP is DPPTrader {

    constructor() public {
        _FACTORY_ = msg.sender;
    }

    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        address iSmartApprove,
        address[] memory configAddresses
    ) external {
        require(msg.sender == _FACTORY_, 'INIT FORBIDDEN');
        initOwner(owner);
        _MAINTAINER_ = maintainer;
        _BASE_TOKEN_ = IERC20(baseTokenAddress);
        _QUOTE_TOKEN_ = IERC20(quoteTokenAddress);
        _DODO_SMART_APPROVE_ = ISmartApprove(iSmartApprove);
        _LP_FEE_RATE_MODEL_ = IFeeRateModel(configAddresses[0]);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(configAddresses[1]);
        _GAS_PRICE_LIMIT_ = IExternalValue(configAddresses[2]);
        _I_ = IExternalValue(configAddresses[3]);
        _K_ = IExternalValue(configAddresses[4]);
        _TRADE_PERMISSION_ = IPermissionManager(configAddresses[5]);
        _resetTargetAndReserve();
    }

    // ============ Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
