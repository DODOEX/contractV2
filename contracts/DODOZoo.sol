/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "./lib/Ownable.sol";

interface IDODO {
    function init(
        address supervisor,
        address maintainer,
        address baseToken,
        address quoteToken,
        address oracle,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 k,
        uint256 gasPriceLimit
    ) external;

    function transferOwnership(address newOwner) external;
}

/**
 * @title DODOZoo
 * @author DODO Breeder
 *
 * @notice Register of All DODO
 */
contract DODOZoo is Ownable {
    address public _DODO_LOGIC_;
    mapping(address => mapping(address => address)) internal _DODO_REGISTER_;

    // ============ Events ============

    event DODOBirth(address newBorn, address baseToken, address quoteToken);

    // ============ Constructor Function ============

    constructor(address _dodoLogic) public {
        _DODO_LOGIC_ = _dodoLogic;
    }

    // ============ Breed DODO Function ============

    function breedDODO(
        address supervisor,
        address maintainer,
        address baseToken,
        address quoteToken,
        address oracle,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 k,
        uint256 gasPriceLimit
    ) external onlyOwner returns (address newBornDODO) {
        require(!isDODORegistered(baseToken, quoteToken), "DODO_REGISTERED");
        // Adapted from https://github.com/optionality/clone-factory/blob/32782f82dfc5a00d103a7e61a17a5dedbd1e8e9d/contracts/CloneFactory.sol
        // create proxy
        bytes20 targetBytes = bytes20(_DODO_LOGIC_);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(
                add(clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            newBornDODO := create(0, clone, 0x37)
        }
        IDODO(newBornDODO).init(
            supervisor,
            maintainer,
            baseToken,
            quoteToken,
            oracle,
            lpFeeRate,
            mtFeeRate,
            k,
            gasPriceLimit
        );
        IDODO(newBornDODO).transferOwnership(_OWNER_);
        _DODO_REGISTER_[baseToken][quoteToken] = newBornDODO;
        emit DODOBirth(newBornDODO, baseToken, quoteToken);
        return newBornDODO;
    }

    function removeDODO(address baseToken, address quoteToken) external onlyOwner {
        _DODO_REGISTER_[baseToken][quoteToken] = address(0);
    }

    // ============ View Functions ============

    function isDODORegistered(address baseToken, address quoteToken) public view returns (bool) {
        if (
            _DODO_REGISTER_[baseToken][quoteToken] == address(0) &&
            _DODO_REGISTER_[quoteToken][baseToken] == address(0)
        ) {
            return false;
        } else {
            return true;
        }
    }

    function getDODO(address baseToken, address quoteToken) external view returns (address) {
        return _DODO_REGISTER_[baseToken][quoteToken];
    }
}
