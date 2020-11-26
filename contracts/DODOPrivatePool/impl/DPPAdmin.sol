/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDPP} from "../intf/IDPP.sol";
import {ISmartApprove} from '../../intf/ISmartApprove.sol';
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

contract DPPAdmin is InitializableOwnable {

    address public _DPP_;
    address public _OPERATOR_; 
    address public _DODO_SMART_APPROVE_;

    function init(address owner, address dpp,address operator, address dodoSmartApprove) external {
        initOwner(owner);
        _DPP_ = dpp;
        _OPERATOR_ = operator;
        _DODO_SMART_APPROVE_ = dodoSmartApprove;
    }

    function setOperator(address newOperator) external onlyOwner {
        _OPERATOR_ = newOperator;
    }

    function setLpFeeRateModel(address newLpFeeRateModel) external onlyOwner {
        IDPP(_DPP_).setLpFeeRateModel(newLpFeeRateModel);
    }

    function setMtFeeRateModel(address newMtFeeRateModel) external onlyOwner {
        IDPP(_DPP_).setMtFeeRateModel(newMtFeeRateModel);
    }

    function setTradePermissionManager(address newTradePermissionManager) external onlyOwner {
        IDPP(_DPP_).setTradePermissionManager(newTradePermissionManager);
    }

    function setMaintainer(address newMaintainer) external onlyOwner {
        IDPP(_DPP_).setMaintainer(newMaintainer);
    }

    function setGasPriceSource(address newGasPriceLimitSource) external onlyOwner {
        IDPP(_DPP_).setGasPriceSource(newGasPriceLimitSource);
    }

    function setISource(address newISource) external onlyOwner {
        IDPP(_DPP_).setISource(newISource);
    }

    function setKSource(address newKSource) external onlyOwner {
        IDPP(_DPP_).setKSource(newKSource);
    }

    function setBuy(bool open) external onlyOwner {
        IDPP(_DPP_).setBuy(open);
    }

    function setSell(bool open) external onlyOwner {
        IDPP(_DPP_).setSell(open);
    }

    function retrieve(address payable to,address token,uint256 amount) external onlyOwner {
        IDPP(_DPP_).retrieve(to,token,amount);
    }

    function reset(
        address assetTo,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount
    ) external {
        require(msg.sender == _OWNER_ || (msg.sender == ISmartApprove(_DODO_SMART_APPROVE_).getSmartSwap() && assetTo == _OPERATOR_), "RESET FORBIDDEN！");
        IDPP(_DPP_).reset(
            assetTo,
            newLpFeeRate,
            newMtFeeRate,
            newI,
            newK,
            baseOutAmount,
            quoteOutAmount
        );
    }

    function resetETH(
        address from,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount
    ) external {
        require(msg.sender == _OWNER_ || (msg.sender == ISmartApprove(_DODO_SMART_APPROVE_).getSmartSwap() && from == _OPERATOR_), "RESET FORBIDDEN！");
        IDPP(_DPP_).reset(
            msg.sender,
            newLpFeeRate,
            newMtFeeRate,
            newI,
            newK,
            baseOutAmount,
            quoteOutAmount
        );
    }

    // ============ Admin Version Control ============
    function version() external pure returns (uint256) {
        return 100; // 1.0.0
    }
}
