/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

interface IDODONFTRegistry {
    function addRegistry(
        address vault,
        address fragment, 
        address feeDistributor,
        address dvm
    ) external;
}

/**
 * @title DODONFT Registry
 * @author DODO Breeder
 *
 * @notice Register DODONFT Pools 
 */
contract DODONFTRegistry is InitializableOwnable {

    mapping (address => bool) public isAdminListed;
    
    // ============ Registry ============

    // Frag -> FeeDistributor
    mapping(address => address) public _FRAG_FEE_REGISTRY_;
    // DVM -> FeeDistributor 
    mapping(address => address) public _DVM_FEE_REGISTRY_;
    // Vault -> Frag
    mapping(address => address) public _VAULT_FRAG_REGISTRY_;

    // ============ Events ============

    event NewRegistry(
        address vault,
        address fragment,
        address feeDistributor,
        address dvm
    );

    event RemoveRegistry(address fragment);


    // ============ Admin Operation Functions ============

    function addRegistry(
        address vault,
        address fragment, 
        address feeDistributor,
        address dvm
    ) external {
        require(isAdminListed[msg.sender], "ACCESS_DENIED");
        _FRAG_FEE_REGISTRY_[fragment] = feeDistributor;
        _DVM_FEE_REGISTRY_[dvm] = feeDistributor;
        _VAULT_FRAG_REGISTRY_[vault] = fragment;
        emit NewRegistry(vault, fragment, feeDistributor, dvm);
    }

    function removeRegistry(
        address vault,
        address fragment, 
        address dvm
    ) external onlyOwner {
        _FRAG_FEE_REGISTRY_[fragment] = address(0);
        _DVM_FEE_REGISTRY_[dvm] = address(0);
        _VAULT_FRAG_REGISTRY_[vault] = address(0);
        emit RemoveRegistry(fragment);
    }

    function addAmindList (address contractAddr) public onlyOwner {
        isAdminListed[contractAddr] = true;
    }

    function removeWhiteList (address contractAddr) public onlyOwner {
        isAdminListed[contractAddr] = false;
    }
}
