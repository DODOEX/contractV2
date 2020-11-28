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
import {DVMTrader} from "./DVMTrader.sol";
import {DVMFunding} from "./DVMFunding.sol";
import {DVMVault} from "./DVMVault.sol";

contract DVM is DVMTrader, DVMFunding {
    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        address lpFeeRateModel,
        address mtFeeRateModel,
        address tradePermissionManager,
        address gasPriceSource,
        uint256 i,
        uint256 k
    ) external {
        initOwner(owner);
        _BASE_TOKEN_ = IERC20(baseTokenAddress);
        _QUOTE_TOKEN_ = IERC20(quoteTokenAddress);
        _LP_FEE_RATE_MODEL_ = IFeeRateModel(lpFeeRateModel);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(mtFeeRateModel);
        _TRADE_PERMISSION_ = IPermissionManager(tradePermissionManager);
        _GAS_PRICE_LIMIT_ = IExternalValue(gasPriceSource);
        _MAINTAINER_ = maintainer;

        require(_BASE_TOKEN_ != _QUOTE_TOKEN_, "BASE_QUOTE_CAN_NOT_BE_SAME");

        require(i > 0 && i <= 10**36);
        _I_ = i;

        require(k > 0 && k <= 10**18);
        _K_ = k;

        string memory connect = "_";
        string memory suffix = "DLP";
        uint32 uid = uint32(address(this));
        bytes memory id = new bytes(4);
        id[0] = bytes1(uint8(48 + (uid % 10)));
        id[1] = bytes1(uint8(48 + ((uid / 10) % 10)));
        id[2] = bytes1(uint8(48 + ((uid / 100) % 10)));
        id[3] = bytes1(uint8(48 + ((uid / 1000) % 10)));

        name = string(
            abi.encodePacked(
                suffix,
                connect,
                _BASE_TOKEN_.symbol(),
                connect,
                _QUOTE_TOKEN_.symbol(),
                connect,
                string(id)
            )
        );
        symbol = "DLP";
        decimals = _BASE_TOKEN_.decimals();
    }

    // ============ Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
