/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {ERC1155} from "../../external/ERC1155/ERC1155.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

contract MysteryBoxERC1155 is ERC1155, InitializableOwnable {
    mapping (address => bool) public _IS_ALLOWED_MINT_;

    // ============ Event =============
    event addMinter(address account);
    event removeMinter(address account);

    function addMintAccount(address account) public onlyOwner {
        _IS_ALLOWED_MINT_[account] = true;
        emit addMinter(account);
    }

    function removeMintAccount(address account) public onlyOwner {
        _IS_ALLOWED_MINT_[account] = false;
        emit removeMinter(account);
    }

    function init(
        address owner,
        string memory uri
    ) public {
        initOwner(owner);
        _setURI(uri);
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data) external {
        require(_IS_ALLOWED_MINT_[msg.sender], "Mint restricted");
        _mint(account, id, amount, data);
    }
}