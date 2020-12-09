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
import {IDPPAdmin} from "../DODOPrivatePool/intf/IDPPAdmin.sol";
import {IPermissionManager} from "../lib/PermissionManager.sol";

contract DPPFactory is Ownable {
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public immutable _DPP_TEMPLATE_;
    address public immutable _FEE_RATE_MODEL_TEMPLATE_;
    address public immutable _PERMISSION_MANAGER_TEMPLATE_;
    address public immutable _DEFAULT_GAS_PRICE_SOURCE_;
    address public immutable _VALUE_SOURCE_;
    address public immutable _DODO_SMART_APPROVE_;
    address public _DPP_ADMIN_TEMPLATE_;

    // ============ Registry ============

    // base -> quote -> DPP address list
    mapping(address => mapping(address => address[])) public _REGISTRY_;
    // creator -> DPP address list
    mapping(address => address[]) public _USER_REGISTRY_;

    // ============ Events ============

    event NewDPP(
        address indexed baseToken,
        address indexed quoteToken,
        address indexed creator,
        address dpp
    );

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address dppTemplate,
        address dppAdminTemplate,
        address defautFeeRateModelTemplate,
        address defaultPermissionManagerTemplate,
        address defaultExternalValueTemplate,
        address defaultGasPriceSource,
        address dodoSmartApprove
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _DPP_TEMPLATE_ = dppTemplate;
        _DPP_ADMIN_TEMPLATE_ = dppAdminTemplate;
        _DODO_SMART_APPROVE_ = dodoSmartApprove;
        _FEE_RATE_MODEL_TEMPLATE_ = defautFeeRateModelTemplate;
        _PERMISSION_MANAGER_TEMPLATE_ = defaultPermissionManagerTemplate;
        _VALUE_SOURCE_ = defaultExternalValueTemplate;
        _DEFAULT_GAS_PRICE_SOURCE_ = defaultGasPriceSource;
    }

    function createDODOPrivatePool() external returns (address newPrivatePool) {
        newPrivatePool = ICloneFactory(_CLONE_FACTORY_).clone(_DPP_TEMPLATE_);
    }

    function initDODOPrivatePool(
        address dppAddress,
        address creator,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 k,
        uint256 i
    ) external {
        {
            address _dppAddress = dppAddress;
            address adminModel = _createDPPAdminModel(
                creator,
                _dppAddress,
                creator,
                _DODO_SMART_APPROVE_
            );
            IDPP(_dppAddress).init(
                adminModel,
                creator,
                baseToken,
                quoteToken,
                _createFeeRateModel(_dppAddress, lpFeeRate),
                _createFeeRateModel(_dppAddress, mtFeeRate),
                _createExternalValueModel(_dppAddress, k),
                _createExternalValueModel(_dppAddress, i),
                _DEFAULT_GAS_PRICE_SOURCE_,
                _createPermissionManager(adminModel)
            );
        }

        _REGISTRY_[baseToken][quoteToken].push(dppAddress);
        _USER_REGISTRY_[creator].push(dppAddress);
        emit NewDPP(baseToken, quoteToken, creator, dppAddress);
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

    function _createExternalValueModel(address owner, uint256 value)
        internal
        returns (address valueModel)
    {
        valueModel = ICloneFactory(_CLONE_FACTORY_).clone(_VALUE_SOURCE_);
        IExternalValue(valueModel).init(owner, value);
    }

    function _createDPPAdminModel(
        address owner,
        address dpp,
        address operator,
        address dodoSmartApprove
    ) internal returns (address adminModel) {
        adminModel = ICloneFactory(_CLONE_FACTORY_).clone(_DPP_ADMIN_TEMPLATE_);
        IDPPAdmin(adminModel).init(owner, dpp, operator, dodoSmartApprove);
    }

    function updateAdminTemplate(address _newDPPAdminTemplate) external onlyOwner {
        _DPP_ADMIN_TEMPLATE_ = _newDPPAdminTemplate;
    }

    // ============ View Functions ============

    function getPrivatePool(address baseToken, address quoteToken)
        external
        view
        returns (address[] memory pools)
    {
        return _REGISTRY_[baseToken][quoteToken];
    }

    function getPrivatePoolBidirection(address token0, address token1)
        external
        view
        returns (address[] memory baseToken0Pool, address[] memory baseToken1Pool)
    {
        return (_REGISTRY_[token0][token1], _REGISTRY_[token1][token0]);
    }

    function getPrivatePoolByUser(address user) 
        external
        view
        returns (address[] memory pools)
    {
        return _USER_REGISTRY_[user];
    }
}
