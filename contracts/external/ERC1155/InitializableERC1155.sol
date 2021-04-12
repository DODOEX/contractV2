/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {ERC1155} from "./ERC1155.sol";

contract InitializableERC1155 is ERC1155 {
    function init(
        address creator,
        uint256 amount,
        string memory baseUrI
    ) public {
        _setURI(baseUrI);
        _mint(creator, 0, amount ,"");
    }
}
