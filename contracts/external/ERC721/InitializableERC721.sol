/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {ERC721} from "./ERC721.sol";

contract InitializableERC721 is ERC721 {
    function init(
        address creator,
        string memory name,
        string memory symbol,
        string memory baseUri
    ) public {
        _name = name;
        _symbol = symbol;
        _baseUri = baseUri;
        _mint(creator, 0);
    }
}