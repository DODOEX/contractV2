/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableInternalMintableERC20} from "../../external/ERC20/InitializableInternalMintableERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterERC721Model} from "../intf/IFilterERC721Model.sol";
import {IFilterERC1155Model} from "../intf/IFilterERC1155Model.sol";
import {IERC721} from "../../intf/IERC721.sol";
import {IERC721Receiver} from "../../intf/IERC721Receiver.sol";
import {IERC1155} from "../../intf/IERC1155.sol";
import {IERC1155Receiver} from "../../intf/IERC1155Receiver.sol";

contract FilterAdmin is InitializableInternalMintableERC20, IERC721Receiver, IERC1155Receiver {
    using SafeMath for uint256;

    // ============ Storage ============
    address public _ERC721_FILTER_MODEL_;
    address public _ERC1155_FILTER_MODEL_;

    function init(
        address _owner,
        uint256 _initSupply,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _erc721FilterModel,
        address _erc1155FilterModel
    ) external {
        super.init(_owner, _initSupply, _name, _symbol, _decimals);
        _ERC721_FILTER_MODEL_ = _erc721FilterModel;
        _ERC1155_FILTER_MODEL_ = _erc1155FilterModel;
    }

    // ============ Event ============
    event RemoveNftToken(address nftContract, uint256 tokenId, uint256 amount);
    event AddNftToken(address nftContract, uint256 tokenId, uint256 amount);


    function depositERC721(address nftContract, uint256[] memory tokenIds) public {
        require(nftContract != address(0), "ZERO_ADDRESS");
        for(uint256 i = 0; i < tokenIds.length; i++) {
            uint256 price = IFilterERC721Model(_ERC721_FILTER_MODEL_).saveNFTPrice(nftContract, tokenIds[i]);
            _mint(msg.sender, price);

            IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenIds[i]);
            emit AddNftToken(nftContract, tokenIds[i], 1);
        }
    }

    function depoistERC1155(address nftContract, uint256[] memory tokenIds, uint256[] memory amounts) public {
        require(nftContract != address(0), "ZERO_ADDRESS");
        require(tokenIds.length == amounts.length, "PARAMS_NOT_MATCH");
        for(uint256 i = 0; i < tokenIds.length; i++) {
            uint256 price = IFilterERC1155Model(_ERC1155_FILTER_MODEL_).saveNFTPrice(nftContract, tokenIds[i], amounts[i]);
            _mint(msg.sender, price);

            emit AddNftToken(nftContract, tokenIds[i], amounts[i]);
        }

        IERC1155(nftContract).safeBatchTransferFrom(msg.sender, address(this), tokenIds, amounts, "");
    }

    function doLotteryERC721() external {
        uint256 lotteryPrice = IFilterERC721Model(_ERC721_FILTER_MODEL_).buyLotteryNFTPrice();
        _burn(msg.sender, lotteryPrice);
        (address nftContract, uint256 tokenId) = IFilterERC721Model(_ERC721_FILTER_MODEL_).lottery();

        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);
        emit RemoveNftToken(nftContract, tokenId, 1);
    }

    function doLotteryERC1155() external {
        uint256 lotteryPrice = IFilterERC1155Model(_ERC1155_FILTER_MODEL_).buyLotteryNFTPrice();
        _burn(msg.sender, lotteryPrice);
        (address nftContract, uint256 tokenId) = IFilterERC1155Model(_ERC721_FILTER_MODEL_).lottery();

        //TODO: amount
        IERC1155(nftContract).safeTransferFrom(address(this), msg.sender, tokenId, 1, "");
        emit RemoveNftToken(nftContract, tokenId, 1);  
    }

    function buySpecERC721(address nftContract, uint256 tokenId) external {
        uint256 price = IFilterERC721Model(_ERC721_FILTER_MODEL_).buySpecNFTPrice(nftContract, tokenId);
        _burn(msg.sender, price);

        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);
        emit RemoveNftToken(nftContract, tokenId, 1);
    }

    function buySpecERC1155(address nftContract, uint256 tokenId, uint256 amount) external {
        uint256 price = IFilterERC1155Model(_ERC1155_FILTER_MODEL_).buySpecNFTPrice(nftContract, tokenId, amount);
        _burn(msg.sender, price);
        IERC1155(nftContract).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        emit RemoveNftToken(nftContract, tokenId, amount);
    }


    function supportsInterface(bytes4 interfaceId) public override view returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId
            || interfaceId == type(IERC721Receiver).interfaceId;
    }

    // ============ Callback ============
    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        emit AddNftToken(msg.sender, tokenId, 1);
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256 id,
        uint256 value,
        bytes calldata
    ) external override returns (bytes4){
        emit AddNftToken(msg.sender, id, value);
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata
    ) external override returns (bytes4){
        require(ids.length == values.length, "PARAMS_NOT_MATCH");
        for(uint256 i = 0; i < ids.length; i++) {
            emit AddNftToken(msg.sender, ids[i], values[i]);
        }
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
}
