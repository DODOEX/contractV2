/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDPPOracle} from "../../intf/IDPPOracle.sol";
import {IDODOApproveProxy} from "../../../SmartRoute/DODOApproveProxy.sol";
import {InitializableOwnable} from "../../../lib/InitializableOwnable.sol";

/**
 * @title DPPOracleAdmin
 * @author DODO Breeder
 *
 * @notice Admin of Oracle DODOPrivatePool
 */
contract DPPOracleAdmin is InitializableOwnable {
    address public _DPP_;
    address public _OPERATOR_;
    address public _DODO_APPROVE_PROXY_;
    uint256 public _FREEZE_TIMESTAMP_;


    modifier notFreezed() {
        require(block.timestamp >= _FREEZE_TIMESTAMP_, "ADMIN_FREEZED");
        _;
    }

    function init(
        address owner,
        address dpp,
        address operator,
        address dodoApproveProxy
    ) external {
        initOwner(owner);
        _DPP_ = dpp;
        _OPERATOR_ = operator;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }

    function sync() external notFreezed onlyOwner {
        IDPPOracle(_DPP_).ratioSync();
    }

    function setFreezeTimestamp(uint256 timestamp) external notFreezed onlyOwner {
        _FREEZE_TIMESTAMP_ = timestamp;
    }

    function setOperator(address newOperator) external notFreezed onlyOwner {
        _OPERATOR_ = newOperator;
    }

    function retrieve(
        address payable to,
        address token,
        uint256 amount
    ) external notFreezed onlyOwner {
        IDPPOracle(_DPP_).retrieve(to, token, amount);
    }

    function changeOracle(address newOracle) external onlyOwner notFreezed {
        IDPPOracle(_DPP_).changeOracle(newOracle);
    }

    function enableOracle() external onlyOwner notFreezed {
        IDPPOracle(_DPP_).enableOracle(); 
    }

    function disableOracle(uint256 newI) external onlyOwner notFreezed {
        IDPPOracle(_DPP_).disableOracle(newI); 
    }

    function tuneParameters(
        uint256 newLpFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 minBaseReserve,
        uint256 minQuoteReserve
    ) external onlyOwner notFreezed returns (bool) {
        return
            IDPPOracle(_DPP_).tuneParameters(
                newLpFeeRate,
                newI,
                newK,
                minBaseReserve,
                minQuoteReserve
            );
    }

    function tunePrice(
        uint256 newI,
        uint256 minBaseReserve,
        uint256 minQuoteReserve
    ) external onlyOwner notFreezed returns (bool) {
        return
            IDPPOracle(_DPP_).tunePrice(
                newI,
                minBaseReserve,
                minQuoteReserve
            );
    }


    function reset(
        address operator,
        uint256 newLpFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint256 minBaseReserve,
        uint256 minQuoteReserve
    ) external notFreezed returns (bool) {
        require(
            msg.sender == _OWNER_ ||
                (IDODOApproveProxy(_DODO_APPROVE_PROXY_).isAllowedProxy(msg.sender) &&
                    operator == _OPERATOR_),
            "RESET FORBIDDEN！"
        ); // only allow owner directly call or operator call via DODODppProxy
        return
            IDPPOracle(_DPP_).reset(
                msg.sender, //only support asset transfer to msg.sender (_OWNER_ or allowed proxy)
                newLpFeeRate,
                newI,
                newK,
                baseOutAmount,
                quoteOutAmount,
                minBaseReserve,
                minQuoteReserve
            );
    }

    // ============ Admin Version Control ============

    function version() external pure returns (string memory) {
        return "DPPOracle Admin 1.1.1";
    }
}