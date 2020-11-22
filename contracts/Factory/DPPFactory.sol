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
    address public _DODO_SMART_APPROVE_;
    address public _DPP_TEMPLATE_;
    address public _FEE_RATE_MODEL_TEMPLATE_;
    address public _PERMISSION_MANAGER_TEMPLATE_;
    address public _VALUE_SOURCE_;

    struct DPPInfo{
        address creator;
        uint256 createTimeStamp;
        //TODO:other tags
    }

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
        address dodoSmartApprove,
        address dppTemplate,
        address defautFeeRateModelTemplate,
        address defaultPermissionManagerTemplate,
        address defaultExternalValueTemplate
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _DODO_SMART_APPROVE_ = dodoSmartApprove;
        _DPP_TEMPLATE_ = dppTemplate;
        _FEE_RATE_MODEL_TEMPLATE_ = defautFeeRateModelTemplate;
        _PERMISSION_MANAGER_TEMPLATE_ = defaultPermissionManagerTemplate;
        _VALUE_SOURCE_ = defaultExternalValueTemplate;
    }

    function createStandardDODOPrivatePool(
        address baseToken,
        address quoteToken,
        address[] memory valueTemplates, //feeeRateAddr,mtRateAddr,gasPriceAddr,kAddr,iAddr
        uint256[] memory values // feeRate,mtRate,gasPrice,k,i
    ) external returns (address newPrivatePool) {
        require(valueTemplates.length == 5 && values.length == 5, "Incorrect number of initialization parameters");

        (address token0, address token1) = baseToken < quoteToken ? (baseToken, quoteToken) : (quoteToken, baseToken);
        uint256 len = _SORT_REGISTRY_[token0][token1].length;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1, len));
        newPrivatePool = ICloneFactory(_CLONE_FACTORY_).clone2(_DPP_TEMPLATE_,salt);

        address[] memory configAddresses = new address[](6);
        configAddresses[0] = (valueTemplates[0] == address(0) ? createFeeRateModel(newPrivatePool, values[0]) : valueTemplates[0]);
        configAddresses[1] = (valueTemplates[1] == address(0) ? createFeeRateModel(newPrivatePool, values[1]) : valueTemplates[1]);
        configAddresses[2] = (valueTemplates[2] == address(0) ? createExternalValueModel(newPrivatePool, values[2]) : valueTemplates[2]);
        configAddresses[3] = (valueTemplates[3] == address(0) ? createExternalValueModel(newPrivatePool, values[3]) : valueTemplates[3]);
        configAddresses[4] = (valueTemplates[4] == address(0) ? createExternalValueModel(newPrivatePool, values[4]) : valueTemplates[4]);
        configAddresses[5] = createPermissionManager(msg.sender);

        IDPP(newPrivatePool).init(
            msg.sender,
            msg.sender,
            baseToken,
            quoteToken,
            _DODO_SMART_APPROVE_,
            configAddresses            
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

    function createFeeRateModel(address owner, uint256 feeRate)
        public
        returns (address feeRateModel)
    {
        feeRateModel = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_RATE_MODEL_TEMPLATE_);
        IFeeRateModel(feeRateModel).init(owner, feeRate);
        return feeRateModel;
    }

    function createPermissionManager(address owner) public returns (address permissionManager) {
        permissionManager = ICloneFactory(_CLONE_FACTORY_).clone(_PERMISSION_MANAGER_TEMPLATE_);
        IPermissionManager(permissionManager).initOwner(owner);
        return permissionManager;
    }

    function createExternalValueModel(address owner, uint256 value)
        public
        returns (address valueModel)
    {
        valueModel = ICloneFactory(_CLONE_FACTORY_).clone(_VALUE_SOURCE_);
        IExternalValue(valueModel).init(owner, value);
        return valueModel;
    }
}
