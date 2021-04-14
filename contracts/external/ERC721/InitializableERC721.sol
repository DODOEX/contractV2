/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {ERC721} from "./ERC721.sol";

contract InitializableERC1155 is ERC721 {
    function init(
        address creator,
        string memory name,
        string memory symbol,
        string memory baseUrI
    ) public {
        _name = name;
        _symbol = symbol;
        _baseURI = baseUrI;
        _mint(creator, 0);
    }
}