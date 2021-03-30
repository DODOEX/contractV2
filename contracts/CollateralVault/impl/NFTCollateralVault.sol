/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {SafeMath} from "../../lib/SafeMath.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IERC721} from "../../intf/IERC721.sol";
import {IERC721Receiver} from "../../intf/IERC721Receiver.sol";
import {IERC1155} from "../../intf/IERC1155.sol";
import {IERC1155Receiver} from "../../intf/IERC1155Receiver.sol";

contract NFTCollateralVault is InitializableOwnable, IERC721Receiver, IERC1155Receiver {

    function transferOwnership(address newOwner) public override onlyOwner {
        emit OwnershipTransferred(_OWNER_, newOwner);
        _OWNER_ = newOwner;
    }

    //TODO? assetTo
    function withdrawERC721(address nftContract, uint256 tokenId) public onlyOwner {
        IERC721(nftContract).safeTransferFrom(msg.sender, _OWNER_, tokenId, "");
    }

    //TODO? assetTo
    function withdrawERC1155(address nftContract, uint256[] memory tokenIds, uint256[] memory amounts) public onlyOwner {
        IERC1155(nftContract).safeBatchTransferFrom(msg.sender, _OWNER_, tokenIds, amounts, "");
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4){
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4){
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public override view returns (bool) {
        return interfaceId == type(IERC1155).interfaceId
            || interfaceId == type(IERC721).interfaceId;
    }
}
