/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {ICloneFactory} from "../lib/CloneFactory.sol";
import {InitializableERC721} from "../external/ERC721/InitializableERC721.sol";

/**
 * @title DODO ERC721Factory
 * @author DODO Breeder
 *
 * @notice Help user to create erc721 token
 */
contract ERC721Facotry {
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public immutable _ERC721_TEMPLATE_;

    // ============ Events ============

    event NewERC721(address erc721, address creator);

    // ============ Registry ============
    mapping(address => address[]) public _USER_REGISTRY_;

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address erc721Template
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _ERC721_TEMPLATE_ = erc721Template;
    }

    function createERC721(
        string memory name,
        string memory symbol,
        string memory baseUrl
    ) external returns (address newERC721) {
        newERC721 = ICloneFactory(_CLONE_FACTORY_).clone(_ERC721_TEMPLATE_);
        InitializableERC721(newERC721).init(name, symbol, baseUrl);
        _USER_REGISTRY_[msg.sender].push(newERC721);
        emit NewERC721(newERC721, msg.sender);
    }


    function getTokenByUser(address user) 
        external
        view
        returns (address[] memory tokens)
    {
        return _USER_REGISTRY_[user];
    }
}
