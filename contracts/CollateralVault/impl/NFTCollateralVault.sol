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

contract NFTCollateralVault is InitializableOwnable, IERC721Receiver, ReentrancyGuard {

    function transferOwnership(address newOwner) external override onlyOwner {
        emit OwnershipTransferred(_OWNER_, newOwner);
        _OWNER_ = newOwner;
    }

    function withdrawERC721(address nftContract, uint256 tokenId) onlyOwner {
        IERC721(nftContract).safeTransferFrom(msg.sender, _OWNER_, tokenId, "");
    }

    function withdrawERC1155(address nftContract, uint256[] tokenIds, uint256[] amounts) onlyOwner {
        IERC1155(nftContract).safeBatchTransferFrom(msg.sender, _OWNER_, tokenIds, amounts, "");
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4){
        return IERC1155Receiver.onERC1155Received.selector;
    };

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4){
        return IERC1155BatchReceiver.onERC1155BatchReceived.selector;
    };
}
