/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../lib/Ownable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {ICP} from "../CrowdPooling/intf/ICP.sol";

contract CrowdPoolingFactory {
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public immutable _CP_TEMPLATE_;
    address public immutable _UNOWNED_DVM_FACTORY_;
    address public immutable _FEE_RATE_MODEL_TEMPLATE_;

    address public immutable _DEFAULT_MAINTAINER_;
    address public immutable _DEFAULT_MT_FEE_RATE_MODEL_;
    address public immutable _DEFAULT_PERMISSION_MANAGER_;
    address public immutable _DEFAULT_GAS_PRICE_SOURCE_;

    // ============ Registry ============

    // base -> quote -> CP address list
    mapping(address => mapping(address => address[])) public _REGISTRY_;
    // creator -> CP address list
    mapping(address => address[]) public _USER_REGISTRY_;

    // ============ Events ============

    event NewCP(
        address indexed baseToken,
        address indexed quoteToken,
        address indexed creator,
        address cp
    );

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address cpTemplate,
        address unOwnedDvmFactory,
        address feeRateModelTemplate,
        address defaultMaintainer,
        address defaultMtFeeRateModel,
        address defaultPermissionManager,
        address defaultGasPriceSource
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _CP_TEMPLATE_ = cpTemplate;
        _UNOWNED_DVM_FACTORY_ = unOwnedDvmFactory;
        _FEE_RATE_MODEL_TEMPLATE_ = feeRateModelTemplate;
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
        _DEFAULT_MT_FEE_RATE_MODEL_ = defaultMtFeeRateModel;
        _DEFAULT_PERMISSION_MANAGER_ = defaultPermissionManager;
        _DEFAULT_GAS_PRICE_SOURCE_ = defaultGasPriceSource;
    }

    function createCrowdPooling() external returns (address newCrowdPooling) {
        newCrowdPooling = ICloneFactory(_CLONE_FACTORY_).clone(_CP_TEMPLATE_);
    }

    function initCrowdPooling(
        address cpAddress,
        address creator,
        address baseToken,
        address quoteToken,
        uint256[] memory timeLine,
        uint256[] memory valueList
    ) external {
        {
        address[] memory addressList = new address[](7);
        addressList[0] = creator;
        addressList[1] = _DEFAULT_MAINTAINER_;
        addressList[2] = baseToken;
        addressList[3] = quoteToken;
        addressList[4] = _DEFAULT_PERMISSION_MANAGER_;
        addressList[5] = _DEFAULT_MT_FEE_RATE_MODEL_;
        addressList[6] = _UNOWNED_DVM_FACTORY_;
        
        ICP(cpAddress).init(
            addressList,
            timeLine,
            valueList
        );
        }

        _REGISTRY_[baseToken][quoteToken].push(cpAddress);
        _USER_REGISTRY_[creator].push(cpAddress);

        emit NewCP(baseToken, quoteToken, creator, cpAddress);
    }

    // ============ View Functions ============

    function getCrowdPooling(address baseToken, address quoteToken)
        external
        view
        returns (address[] memory pools)
    {
        return _REGISTRY_[baseToken][quoteToken];
    }

    function getCrowdPoolingBidirection(address token0, address token1)
        external
        view
        returns (address[] memory baseToken0Pools, address[] memory baseToken1Pools)
    {
        return (_REGISTRY_[token0][token1], _REGISTRY_[token1][token0]);
    }

    function getCrowdPoolingByUser(address user)
        external
        view
        returns (address[] memory pools)
    {
        return _USER_REGISTRY_[user];
    }
}
