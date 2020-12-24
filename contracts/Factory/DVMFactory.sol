/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {IFeeRateModel} from "../lib/FeeRateModel.sol";
import {IDVM} from "../DODOVendingMachine/intf/IDVM.sol";
import {IDVMAdmin} from "../DODOVendingMachine/intf/IDVMAdmin.sol";
import {IPermissionManager} from "../lib/PermissionManager.sol";

interface IDVMFactory {
    function createDODOVendingMachine(
        address creator,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k
    ) external returns (address newVendingMachine);
    
    function createUnOwnedDODOVendingMachine(
        address creator,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 i,
        uint256 k
    ) external returns (address newVendingMachine);
}

contract DVMFactory is InitializableOwnable {
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public immutable _DVM_TEMPLATE_;
    address public immutable _FEE_RATE_MODEL_TEMPLATE_;
    address public immutable _PERMISSION_MANAGER_TEMPLATE_;
    address public _DVM_ADMIN_TEMPLATE_;
    
    address public immutable _DEFAULT_MAINTAINER_;
    address public immutable _DEFAULT_MT_FEE_RATE_MODEL_;
    address public immutable _DEFAULT_PERMISSION_MANAGER_;
    address public immutable _DEFAULT_GAS_PRICE_SOURCE_;

    address internal constant _EMPTY_ = 0x0000000000000000000000000000000000000000;

    // ============ Registry ============

    // base -> quote -> DVM address list
    mapping(address => mapping(address => address[])) public _REGISTRY_;
    // creator -> DVM address list
    mapping(address => address[]) public _USER_REGISTRY_;

    // ============ Events ============

    event NewDVM(
        address baseToken,
        address quoteToken,
        address creator,
        address dvm
    );

    event RemoveDVM(address dvm);

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address dvmTemplate,
        address dvmAdminTemplate,
        address feeRateModelTemplate,
        address permissionManagerTemplate,
        address defaultGasPriceSource,
        address defaultMaintainer,
        address defaultMtFeeRateModel,
        address defaultPermissionManager
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _DVM_TEMPLATE_ = dvmTemplate;
        _DVM_ADMIN_TEMPLATE_ = dvmAdminTemplate;
        _FEE_RATE_MODEL_TEMPLATE_ = feeRateModelTemplate;
        _PERMISSION_MANAGER_TEMPLATE_ = permissionManagerTemplate;
        
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
        _DEFAULT_MT_FEE_RATE_MODEL_ = defaultMtFeeRateModel;
        _DEFAULT_PERMISSION_MANAGER_ = defaultPermissionManager;
        _DEFAULT_GAS_PRICE_SOURCE_ = defaultGasPriceSource;
    }

    function createDODOVendingMachine(
        address creator,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k
    ) external returns (address newVendingMachine) {
        newVendingMachine = ICloneFactory(_CLONE_FACTORY_).clone(_DVM_TEMPLATE_);
        {
            address adminModel = _createDVMAdminModel(creator, newVendingMachine);
            IDVM(newVendingMachine).init(
                adminModel,
                creator,
                baseToken,
                quoteToken,
                _createFeeRateModel(adminModel, lpFeeRate),
                _createFeeRateModel(adminModel, mtFeeRate),
                _createPermissionManager(adminModel),
                _DEFAULT_GAS_PRICE_SOURCE_,
                i,
                k
            );
        }
        _REGISTRY_[baseToken][quoteToken].push(newVendingMachine);
        _USER_REGISTRY_[creator].push(newVendingMachine);
        emit NewDVM(baseToken, quoteToken, creator, newVendingMachine);
    }


    function createUnOwnedDODOVendingMachine(
        address creator,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 i,
        uint256 k
    ) external returns (address newVendingMachine) {
        newVendingMachine = ICloneFactory(_CLONE_FACTORY_).clone(_DVM_TEMPLATE_);
        {
            IDVM(newVendingMachine).init(
                _EMPTY_,
                _DEFAULT_MAINTAINER_,
                baseToken,
                quoteToken,
                _createFeeRateModel(_EMPTY_, lpFeeRate),
                _DEFAULT_MT_FEE_RATE_MODEL_,
                _DEFAULT_PERMISSION_MANAGER_,
                _DEFAULT_GAS_PRICE_SOURCE_,
                i,
                k
            );
        }
        _REGISTRY_[baseToken][quoteToken].push(newVendingMachine);
        _USER_REGISTRY_[creator].push(newVendingMachine);
        emit NewDVM(baseToken, quoteToken, creator, newVendingMachine);
    }


    function _createFeeRateModel(address owner, uint256 feeRate)
        internal
        returns (address feeRateModel)
    {
        feeRateModel = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_RATE_MODEL_TEMPLATE_);
        IFeeRateModel(feeRateModel).init(owner, feeRate);
    }

    function _createPermissionManager(address owner) internal returns (address permissionManager) {
        permissionManager = ICloneFactory(_CLONE_FACTORY_).clone(_PERMISSION_MANAGER_TEMPLATE_);
        IPermissionManager(permissionManager).initOwner(owner);
    }

    function _createDVMAdminModel(address owner, address dvm)
        internal
        returns (address adminModel)
    {
        adminModel = ICloneFactory(_CLONE_FACTORY_).clone(_DVM_ADMIN_TEMPLATE_);
        IDVMAdmin(adminModel).init(owner, dvm);
    }

    // ============ Admin Operation Functions ============
    function updateAdminTemplate(address _newDVMAdminTemplate) external onlyOwner {
        _DVM_ADMIN_TEMPLATE_ = _newDVMAdminTemplate;
    }

    function addPoolByAdmin(
        address creator,
        address baseToken, 
        address quoteToken,
        address pool
    ) external onlyOwner {
        _REGISTRY_[baseToken][quoteToken].push(pool);
        _USER_REGISTRY_[creator].push(pool);
        emit NewDVM(baseToken, quoteToken, creator, pool);
    }

    function removePoolByAdmin(
        address creator,
        address baseToken, 
        address quoteToken,
        address pool
    ) external onlyOwner {
        address[] memory registryList = _REGISTRY_[baseToken][quoteToken];
        for (uint256 i = 0; i < registryList.length; i++) {
            if (registryList[i] == pool) {
                registryList[i] = registryList[registryList.length - 1];
                break;
            }
        }
        _REGISTRY_[baseToken][quoteToken] = registryList;
        _REGISTRY_[baseToken][quoteToken].pop();
        address[] memory userRegistryList = _USER_REGISTRY_[creator];
        for (uint256 i = 0; i < userRegistryList.length; i++) {
            if (userRegistryList[i] == pool) {
                userRegistryList[i] = userRegistryList[userRegistryList.length - 1];
                break;
            }
        }
        _USER_REGISTRY_[creator] = userRegistryList;
        _USER_REGISTRY_[creator].pop();
        emit RemoveDVM(pool);
    }

    // ============ View Functions ============

    function getVendingMachine(address baseToken, address quoteToken)
        external
        view
        returns (address[] memory machines)
    {
        return _REGISTRY_[baseToken][quoteToken];
    }

    function getVendingMachineBidirection(address token0, address token1)
        external
        view
        returns (address[] memory baseToken0Machines, address[] memory baseToken1Machines)
    {
        return (_REGISTRY_[token0][token1], _REGISTRY_[token1][token0]);
    }

    function getVendingMachineByUser(address user)
        external
        view
        returns (address[] memory machines)
    {
        return _USER_REGISTRY_[user];
    }
}
