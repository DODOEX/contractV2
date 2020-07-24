/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "./lib/Ownable.sol";
import {ICloneFactory} from "./helper/CloneFactory.sol";

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
    address public _CLONE_FACTORY_;

    mapping(address => mapping(address => address)) internal _DODO_REGISTER_;

    // ============ Events ============

    event DODOBirth(address newBorn, address baseToken, address quoteToken);

    // ============ Constructor Function ============

    constructor(address _dodoLogic, address _cloneFactory) public {
        _DODO_LOGIC_ = _dodoLogic;
        _CLONE_FACTORY_ = _cloneFactory;
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
        newBornDODO = ICloneFactory(_CLONE_FACTORY_).clone(_DODO_LOGIC_);
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
