/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDVM} from "../intf/IDVM.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IExternalValue} from "../../lib/ExternalValue.sol";

contract DVMAdmin is InitializableOwnable {
    address public _DVM_;

    function init(address owner, address dvm) external {
        initOwner(owner);
        _DVM_ = dvm;
    }

    // function setLpFeeRateModel(address newLpFeeRateModel) external onlyOwner {
    //     IDVM(_DVM_).setLpFeeRateModel(newLpFeeRateModel);
    // }

    function setLpFeeRateValue(uint256 newLpFeeRate) external onlyOwner {
        IExternalValue(IDVM(_DVM_)._LP_FEE_RATE_MODEL_()).set(newLpFeeRate);
    }

    // function setMtFeeRateModel(address newMtFeeRateModel) external onlyOwner {
    //     IDVM(_DVM_).setMtFeeRateModel(newMtFeeRateModel);
    // }

    function setMtFeeRateValue(uint256 newMtFeeRate) external onlyOwner {
        IExternalValue(IDVM(_DVM_)._MT_FEE_RATE_MODEL_()).set(newMtFeeRate);
    }

    // function setTradePermissionManager(address newTradePermissionManager) external onlyOwner {
    //     IDVM(_DVM_).setTradePermissionManager(newTradePermissionManager);
    // }

    function setMaintainer(address newMaintainer) external onlyOwner {
        IDVM(_DVM_).setMaintainer(newMaintainer);
    }

    // function setGasPriceSource(address newGasPriceLimitSource) external onlyOwner {
    //     IDVM(_DVM_).setGasPriceSource(newGasPriceLimitSource);
    // }

    function setBuy(bool open) external onlyOwner {
        IDVM(_DVM_).setBuy(open);
    }

    function setSell(bool open) external onlyOwner {
        IDVM(_DVM_).setSell(open);
    }

    // ============ Admin Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
