/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {ERC721} from "../../external/ERC721/ERC721.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

contract MysteryBoxERC721 is ERC721,InitializableOwnable {
    mapping (address => bool) public _IS_ALLOWED_MINT_;

    function addMintAccount(address account) public onlyOwner {
        _IS_ALLOWED_MINT_[account] = true;
    }

    function removeMintAccount(address account) public onlyOwner {
        _IS_ALLOWED_MINT_[account] = false;
    }

    function init(
        address owner,
        string memory name,
        string memory symbol,
        string memory uri
    ) public {
        initOwner(owner);
        _name = name;
        _symbol = symbol;
        _baseUri = uri;
    }

    function mint(address to, uint256 tokenId) external {
        require(_IS_ALLOWED_MINT_[msg.sender], "Mint restricted");
        _mint(to, tokenId);
    }
}