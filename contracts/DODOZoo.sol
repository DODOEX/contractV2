/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "./lib/Ownable.sol";
import {IDODO} from "./intf/IDODO.sol";
import {DODO} from "./DODO.sol";


/**
 * @title DODOZoo
 * @author DODO Breeder
 *
 * @notice Register of All DODO
 */
contract DODOZoo is Ownable {
    mapping(address => mapping(address => address)) internal _DODO_REGISTER_;

    // ============ Events ============

    event DODOBirth(address newBorn);

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
    ) public onlyOwner returns (address) {
        require(!isDODORegistered(baseToken, quoteToken), "DODO_IS_REGISTERED");
        require(baseToken != quoteToken, "BASE_IS_SAME_WITH_QUOTE");
        address newBornDODO = address(new DODO());
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
        emit DODOBirth(newBornDODO);
        return newBornDODO;
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
