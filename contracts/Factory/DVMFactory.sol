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
import {IDVMAdmin} from "../DODOVendingMachine/intf/IDVMAdmin.sol";
import {IPermissionManager} from "../lib/PermissionManager.sol";

contract DVMFactory is Ownable {
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public immutable _DVM_TEMPLATE_;
    address public immutable _FEE_RATE_MODEL_TEMPLATE_;
    address public immutable _PERMISSION_MANAGER_TEMPLATE_;
    address public immutable _DEFAULT_GAS_PRICE_SOURCE_;
    address public _DVM_ADMIN_TEMPLATE_;

    // ============ Registry ============

    // base -> quote -> DVM address list
    mapping(address => mapping(address => address[])) public _REGISTRY_;
    // creator -> DVM address list
    mapping(address => address[]) public _USER_REGISTRY_;

    // ============ Events ============

    event NewDVM(
        address indexed baseToken,
        address indexed quoteToken,
        address indexed creator,
        address dvm
    );

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address dvmTemplate,
        address dvmAdminTemplate,
        address feeRateModelTemplate,
        address permissionManagerTemplate,
        address defaultGasPriceSource
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _DVM_TEMPLATE_ = dvmTemplate;
        _DVM_ADMIN_TEMPLATE_ = dvmAdminTemplate;
        _FEE_RATE_MODEL_TEMPLATE_ = feeRateModelTemplate;
        _PERMISSION_MANAGER_TEMPLATE_ = permissionManagerTemplate;
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

    function _createFeeRateModel(address owner, uint256 feeRate)
        internal
        returns (address feeRateModel)
    {
        feeRateModel = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_RATE_MODEL_TEMPLATE_);
        IConstFeeRateModel(feeRateModel).init(owner, feeRate);
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

    function updateAdminTemplate(address _newDVMAdminTemplate) external onlyOwner {
        _DVM_ADMIN_TEMPLATE_ = _newDVMAdminTemplate;
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
