/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../lib/Ownable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {DVMVault} from "./impl/DVMVault.sol";
import {DVMController} from "./impl/DVMController.sol";

contract DVMFactory is Ownable {
    address public _CLONE_FACTORY_;
    address public _VAULT_TEMPLATE_;
    address public _CONTROLLER_TEMPLATE_;

    // base -> quote -> DVM address list
    mapping(address => mapping(address => address[])) _REGISTRY_;

    constructor(
        address cloneFactory,
        address vaultTemplate,
        address controllerTemplate
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _VAULT_TEMPLATE_ = vaultTemplate;
        _CONTROLLER_TEMPLATE_ = controllerTemplate;
    }

    function createDODOVenderMachine(
        address maintainer,
        address baseToken,
        address quoteToken,
        address lpFeeRateModel,
        address mtFeeRateModel,
        uint256 i,
        uint256 k,
        uint256 gasPriceLimit
    ) external returns (address newVenderMachine) {
        DVMController controller = DVMController(
            ICloneFactory(_CLONE_FACTORY_).clone(_CONTROLLER_TEMPLATE_)
        );
        DVMVault vault = DVMVault(ICloneFactory(_CLONE_FACTORY_).clone(_VAULT_TEMPLATE_));
        vault.init(address(controller), baseToken, quoteToken); // vault owner is controller

        controller.init(
            msg.sender,
            maintainer,
            address(vault),
            lpFeeRateModel,
            mtFeeRateModel,
            i,
            k,
            gasPriceLimit
        );

        newVenderMachine = address(controller);
        _REGISTRY_[baseToken][quoteToken].push(newVenderMachine);
        return newVenderMachine;
    }
}
