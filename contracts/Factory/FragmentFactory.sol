/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {IDVM} from "../DODOVendingMachine/intf/IDVM.sol";

interface IFragmentFactory {
    function createFragment() external returns (address newVendingMachine);
}

contract FragmentFactory is InitializableOwnable {
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public immutable _MT_FEE_RATE_MODEL_;
    address public _DVM_TEMPLATE_;
    address public _FEE_DISTRIBUTOR_TEMPLATE_;
    address public _FRAGMENT_TEMPLATE_;

    // ============ Registry ============

    // base -> quote -> DVM address list
    mapping(address => mapping(address => address[])) public _REGISTRY_;
    // creator -> DVM address list
    mapping(address => address[]) public _USER_REGISTRY_;

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address dvmTemplate,
        address feeDistributorTemplate,
        address fragmentTemplate,
        address mtFeeRateModel
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _DVM_TEMPLATE_ = dvmTemplate;
        _FEE_DISTRIBUTOR_TEMPLATE_ = feeDistributorTemplate;
        _FRAGMENT_TEMPLATE_ = fragmentTemplate;
        _MT_FEE_RATE_MODEL_ = mtFeeRateModel;
    }

    function createFragment(
        address owner,
        address vault,
        address quoteToken,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 totalSupply,
        uint256 ownerRatio,
        uint256 buyoutTimestamp
    ) external returns (address newFragment) {
        newFragment = ICloneFactory(_CLONE_FACTORY_).clone(_FRAGMENT_TEMPLATE_);
        newVendingMachine = ICloneFactory(_CLONE_FACTORY_).clone(_DVM_TEMPLATE_);
        newFeeDistributor = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_DISTRIBUTOR_TEMPLATE_);

        {
            IFeeDistributor(newFeeDistributor).init(newFragment, quoteToken, newFragment);
        }

        {
            IDVM(newVendingMachine).init(
                newFeeDistributor,
                newFragment,
                quoteToken,
                0,
                mtFeeRateModel,
                i,
                k,
                false
            );
            IFeeRateRegistry(mtFeeRateModel).set(newVendingMachine, mtFeeRate)
        }

        {
            IFragment(newFragment).init(owner, newVendingMachine, vault, totalSupply, ownerRatio, buyoutTimestamp);
        }
    }
}
