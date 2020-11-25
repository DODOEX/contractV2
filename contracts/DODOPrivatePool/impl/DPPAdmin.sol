/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDPP} from "../intf/IDPP.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

contract DPPAdmin is InitializableOwnable {

    address public dpp;

    function init(address owner, address _dpp) external {
        initOwner(owner);
        dpp = _dpp;
    }

    function setLpFeeRateModel(address newLpFeeRateModel) external onlyOwner {
        IDPP(dpp).setLpFeeRateModel(newLpFeeRateModel);
    }

    function setMtFeeRateModel(address newMtFeeRateModel) external onlyOwner {
        IDPP(dpp).setMtFeeRateModel(newMtFeeRateModel);
    }

    function setTradePermissionManager(address newTradePermissionManager) external onlyOwner {
        IDPP(dpp).setTradePermissionManager(newTradePermissionManager);
    }

    function setMaintainer(address newMaintainer) external onlyOwner {
        IDPP(dpp).setMaintainer(newMaintainer);
    }

    function setOperator(address newOperator) external onlyOwner {
        IDPP(dpp).setOperator(newOperator);
    }

    function setGasPriceSource(address newGasPriceLimitSource) external onlyOwner {
        IDPP(dpp).setGasPriceSource(newGasPriceLimitSource);
    }

    function setISource(address newISource) external onlyOwner {
        IDPP(dpp).setISource(newISource);
    }

    function setKSource(address newKSource) external onlyOwner {
        IDPP(dpp).setKSource(newKSource);
    }

    function setBuy(bool open) external onlyOwner {
        IDPP(dpp).setBuy(open);
    }

    function setSell(bool open) external onlyOwner {
        IDPP(dpp).setSell(open);
    }

    function retrieve(address payable to,address token,uint256 amount) external onlyOwner {
        IDPP(dpp).retrieve(to,token,amount);
    }

    // ============ Admin Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
