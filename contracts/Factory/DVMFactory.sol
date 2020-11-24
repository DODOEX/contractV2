/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../lib/Ownable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {IConstFeeRateModel} from "../lib/ConstFeeRateModel.sol";
import {IDVM} from "../DODOVendingMachine/intf/IDVM.sol";
import {IPermissionManager} from "../lib/PermissionManager.sol";

contract DVMFactory is Ownable {
    address public _CLONE_FACTORY_;
    address public _DVM_TEMPLATE_;
    address public _FEE_RATE_MODEL_TEMPLATE_;
    address public _PERMISSION_MANAGER_TEMPLATE_;
    address public _DEFAULT_GAS_PRICE_SOURCE_;

    struct DVMInfo {
        address creator;
        uint256 createTimeStamp;
        //TODO:other tags
    }

    // base -> quote -> DVM address list
    mapping(address => mapping(address => address[])) _REGISTRY_;
    // token0 -> token1 -> DVM address list
    mapping(address => mapping(address => address[])) _SORT_REGISTRY_;
    // creator -> DVM address list
    mapping(address => address[]) _USER_REGISTRY_;
    // DVM address -> info
    mapping(address => DVMInfo) _DVM_INFO_;

    constructor(
        address cloneFactory,
        address dvmTemplate,
        address feeRateModelTemplate,
        address permissionManagerTemplate,
        address defaultGasPriceSource
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _DVM_TEMPLATE_ = dvmTemplate;
        _FEE_RATE_MODEL_TEMPLATE_ = feeRateModelTemplate;
        _PERMISSION_MANAGER_TEMPLATE_ = permissionManagerTemplate;
        _DEFAULT_GAS_PRICE_SOURCE_ = defaultGasPriceSource;
    }

    function createDODOVendingMachine(
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k
    ) external returns (address newVendingMachine) {
        (address token0, address token1) = baseToken < quoteToken ? (baseToken, quoteToken) : (quoteToken, baseToken);
        newVendingMachine = ICloneFactory(_CLONE_FACTORY_).clone(_DVM_TEMPLATE_);

        IDVM(newVendingMachine).init(
            msg.sender,
            msg.sender,
            baseToken,
            quoteToken,
            //TODO:标准库 统一的feeRateModel，owner归平台控制
            _createConstFeeRateModel(newVendingMachine, lpFeeRate),
            _createConstFeeRateModel(newVendingMachine, mtFeeRate),
            _createPermissionManager(msg.sender),
            _DEFAULT_GAS_PRICE_SOURCE_,
            i,
            k
        );

        _REGISTRY_[baseToken][quoteToken].push(newVendingMachine);
        _SORT_REGISTRY_[token0][token1].push(newVendingMachine);
        _USER_REGISTRY_[msg.sender].push(newVendingMachine);
        _DVM_INFO_[newVendingMachine] = (
            DVMInfo({
                creator: msg.sender,
                createTimeStamp: block.timestamp
            })
        );
        return newVendingMachine;
    }

    function _createConstFeeRateModel(address owner, uint256 feeRate) internal returns (address feeRateModel) {
        feeRateModel = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_RATE_MODEL_TEMPLATE_);
        IConstFeeRateModel(feeRateModel).init(owner, feeRate);
        return feeRateModel;
    }

    function _createPermissionManager(address owner) internal returns (address permissionManager) {
        permissionManager = ICloneFactory(_CLONE_FACTORY_).clone(_PERMISSION_MANAGER_TEMPLATE_);
        IPermissionManager(permissionManager).initOwner(owner);
        return permissionManager;
    }

    function getVendingMachine(address baseToken, address quoteToken)
        external
        view
        returns (address[] memory machines)
    {
        return _REGISTRY_[baseToken][quoteToken];
    }
}
