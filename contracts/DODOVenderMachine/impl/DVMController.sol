/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DVMTrader} from "./DVMTrader.sol";
import {DVMFunding} from "./DVMFunding.sol";
import {DVMAdmin} from "./DVMAdmin.sol";
import {DVMVault} from "./DVMVault.sol";
import {IFeeRateModel} from "../../intf/IFeeRateModel.sol";

contract DVMController is DVMTrader, DVMFunding, DVMAdmin {
    function init(
        address owner,
        address maintainer,
        address vault,
        address lpFeeRateModel,
        address mtFeeRateModel,
        uint256 i,
        uint256 k,
        uint256 gasPriceLimit
    ) external {
        initOwner(owner);
        _MAINTAINER_ = maintainer;
        _BASE_TOKEN_ = DVMVault(vault)._BASE_TOKEN_();
        _QUOTE_TOKEN_ = DVMVault(vault)._QUOTE_TOKEN_();
        _LP_FEE_RATE_MODEL_ = IFeeRateModel(lpFeeRateModel);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(mtFeeRateModel);
        _I_ = i;
        _K_ = k;
        _GAS_PRICE_LIMIT_ = gasPriceLimit;
    }
}
