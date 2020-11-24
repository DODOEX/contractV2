/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../lib/Ownable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {IFeeRateModel} from "../lib/FeeRateModel.sol";
import {IExternalValue} from "../lib/ExternalValue.sol";
import {IDPP} from "../DODOPrivatePool/intf/IDPP.sol";
import {IPermissionManager} from "../lib/PermissionManager.sol";

contract DPPFactory is Ownable {
    address public _CLONE_FACTORY_;
    address public _DPP_TEMPLATE_;
    address public _FEE_RATE_MODEL_TEMPLATE_;
    address public _PERMISSION_MANAGER_TEMPLATE_;
    address public _VALUE_SOURCE_;

    //TODO: 平台修改tag的权限
    struct DPPInfo {
        address creator;
        uint256 createTimeStamp;
        //TODO:池子类型
    }

    //TODO:tags filter event

    // base -> quote -> DPP address list
    mapping(address => mapping(address => address[])) _REGISTRY_;
    // token0 -> token1 -> DPP address list
    mapping(address => mapping(address => address[])) _SORT_REGISTRY_;
    // creator -> DPP address list
    mapping(address => address[]) _USER_REGISTRY_;
    // DPP address -> info
    mapping(address => DPPInfo) _DPP_INFO_;

    constructor(
        address cloneFactory,
        address dppTemplate,
        address defautFeeRateModelTemplate,
        address defaultPermissionManagerTemplate,
        address defaultExternalValueTemplate
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _DPP_TEMPLATE_ = dppTemplate;
        _FEE_RATE_MODEL_TEMPLATE_ = defautFeeRateModelTemplate;
        _PERMISSION_MANAGER_TEMPLATE_ = defaultPermissionManagerTemplate;
        _VALUE_SOURCE_ = defaultExternalValueTemplate;
    }

    function createDODOPrivatePool(
        address baseToken,
        address quoteToken,
        //TODO: tag 粒度
        address[] memory valueTemplates, //feeRateAddr,mtRateAddr,kAddr,iAddr
        uint256[] memory values // feeRate,mtRate,k,i
    ) external returns (address newPrivatePool) {
        require(valueTemplates.length == 4 && values.length == 4, "Incorrect number of initialization parameters");
        (address token0, address token1) = baseToken < quoteToken ? (baseToken, quoteToken) : (quoteToken, baseToken);
        newPrivatePool = ICloneFactory(_CLONE_FACTORY_).clone(_DPP_TEMPLATE_);

        IDPP(newPrivatePool).init(
            msg.sender,
            msg.sender,
            baseToken,
            quoteToken,
            (valueTemplates[0] == address(0) ? _createFeeRateModel(newPrivatePool, values[0]) : valueTemplates[0]),
            (valueTemplates[1] == address(0) ? _createFeeRateModel(newPrivatePool, values[1]) : valueTemplates[1]),
            (valueTemplates[2] == address(0) ? _createExternalValueModel(newPrivatePool, values[2]) : valueTemplates[2]),
            (valueTemplates[3] == address(0) ? _createExternalValueModel(newPrivatePool, values[3]) : valueTemplates[3]),
            //hardcode
            _createExternalValueModel(msg.sender, 10**22),
            _createPermissionManager(msg.sender)          
        );

        _REGISTRY_[baseToken][quoteToken].push(newPrivatePool);
        _SORT_REGISTRY_[token0][token1].push(newPrivatePool);
        _USER_REGISTRY_[msg.sender].push(newPrivatePool);
        _DPP_INFO_[newPrivatePool] = (
            DPPInfo({
                creator: msg.sender,
                createTimeStamp: block.timestamp
            })
        );
        return newPrivatePool;
    }

    function _createFeeRateModel(address owner, uint256 feeRate) internal returns (address feeRateModel){
        feeRateModel = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_RATE_MODEL_TEMPLATE_);
        IFeeRateModel(feeRateModel).init(owner, feeRate);
        return feeRateModel;
    }

    function _createPermissionManager(address owner) internal returns (address permissionManager) {
        permissionManager = ICloneFactory(_CLONE_FACTORY_).clone(_PERMISSION_MANAGER_TEMPLATE_);
        IPermissionManager(permissionManager).initOwner(owner);
        return permissionManager;
    }

    function _createExternalValueModel(address owner, uint256 value) internal returns (address valueModel) {
        valueModel = ICloneFactory(_CLONE_FACTORY_).clone(_VALUE_SOURCE_);
        IExternalValue(valueModel).init(owner, value);
        return valueModel;
    }
}
