/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

//TODO:
contract InitializableERC721 is InitializableOwnable {


    function init(
        address creator,
        string memory name,
        string memory symbol,
        string memory baseUrl
    ) public {
        initOwner(creator);
        // super(name,symbol);
    }

    // baseUrl overide

    // function mint(string memory _name, address _to) public {
    //     require(msg.sender == gameOwner, "Only game owner can create new monsters");
    //     uint id = monsters.length;
    //     monsters.push(Monster(_name, 1));
    //     _safeMint(_to, id);
    // }
}
