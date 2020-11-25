/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDVM} from "../intf/IDVM.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

contract DVMAdmin is InitializableOwnable {

    address public dvm;

    function init(address owner, address _dvm) external {
        initOwner(owner);
        dvm = _dvm;
    }

    function setLpFeeRateModel(address newLpFeeRateModel) external onlyOwner {
        IDVM(dvm).setLpFeeRateModel(newLpFeeRateModel);
    }

    function setMtFeeRateModel(address newMtFeeRateModel) external onlyOwner {
        IDVM(dvm).setMtFeeRateModel(newMtFeeRateModel);
    }

    function setTradePermissionManager(address newTradePermissionManager) external onlyOwner {
        IDVM(dvm).setTradePermissionManager(newTradePermissionManager);
    }

    function setMaintainer(address newMaintainer) external onlyOwner {
        IDVM(dvm).setMaintainer(newMaintainer);
    }

    function setGasPriceSource(address newGasPriceLimitSource) external onlyOwner {
        IDVM(dvm).setGasPriceSource(newGasPriceLimitSource);
    }

    function setBuy(bool open) external onlyOwner {
        IDVM(dvm).setBuy(open);
    }

    function setSell(bool open) external onlyOwner {
        IDVM(dvm).setSell(open);
    }

    // ============ Admin Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
