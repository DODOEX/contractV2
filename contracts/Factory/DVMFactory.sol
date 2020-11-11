/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../lib/Ownable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {IConstFeeRateModel} from "../lib/ConstFeeRateModel.sol";
import {IDVM} from "../DODOVendorMachine/intf/IDVM.sol";
import {IDVMVault} from "../DODOVendorMachine/intf/IDVMVault.sol";
import {IPermissionManager} from "../lib/PermissionManager.sol";

contract DVMFactory is Ownable {
    address public _CLONE_FACTORY_;
    address public _VAULT_TEMPLATE_;
    address public _DVM_TEMPLATE_;
    address public _FEE_RATE_MODEL_TEMPLATE_;
    address public _PERMISSION_MANAGER_TEMPLATE_;

    address public _DEFAULT_GAS_PRICE_SOURCE_;

    // base -> quote -> DVM address list
    mapping(address => mapping(address => address[])) _REGISTRY_;

    constructor(
        address cloneFactory,
        address vaultTemplate,
        address dvmTemplate,
        address feeRateModelTemplate,
        address permissionManagerTemplate,
        address defaultGasPriceSource
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _VAULT_TEMPLATE_ = vaultTemplate;
        _DVM_TEMPLATE_ = dvmTemplate;
        _FEE_RATE_MODEL_TEMPLATE_ = feeRateModelTemplate;
        _PERMISSION_MANAGER_TEMPLATE_ = permissionManagerTemplate;
        _DEFAULT_GAS_PRICE_SOURCE_ = defaultGasPriceSource;
    }

    function createStandardDODOVendorMachine(
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k
    ) external returns (address newVendorMachine) {
        newVendorMachine = ICloneFactory(_CLONE_FACTORY_).clone(_DVM_TEMPLATE_);

        address vault = ICloneFactory(_CLONE_FACTORY_).clone(_VAULT_TEMPLATE_);

        IDVMVault(vault).init(newVendorMachine, baseToken, quoteToken); // vault owner is controller
        IDVM(newVendorMachine).init(
            msg.sender,
            msg.sender,
            vault,
            createConstFeeRateModel(msg.sender, lpFeeRate),
            createConstFeeRateModel(msg.sender, mtFeeRate),
            createPermissionManager(msg.sender),
            _DEFAULT_GAS_PRICE_SOURCE_,
            i,
            k
        );

        _REGISTRY_[baseToken][quoteToken].push(newVendorMachine);
        return newVendorMachine;
    }

    function createConstFeeRateModel(address owner, uint256 feeRate)
        public
        returns (address feeRateModel)
    {
        feeRateModel = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_RATE_MODEL_TEMPLATE_);
        IConstFeeRateModel(feeRateModel).init(owner, feeRate);
        return feeRateModel;
    }

    function createPermissionManager(address owner) public returns (address permissionManager) {
        permissionManager = ICloneFactory(_CLONE_FACTORY_).clone(_PERMISSION_MANAGER_TEMPLATE_);
        IPermissionManager(permissionManager).initOwner(owner);
        return permissionManager;
    }

    function getVendorMachine(address baseToken, address quoteToken)
        external
        view
        returns (address[] memory machines)
    {
        return _REGISTRY_[baseToken][quoteToken];
    }
}
