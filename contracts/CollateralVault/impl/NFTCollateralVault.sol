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
    using SafeMath for uint256;

    // ============ Storage ============
    string public name;
    string public baseURI;

    struct NftInfo {
        uint256 tokenId; 
        uint256 amount;
        address nftContract;
    }
    NftInfo[] public nftInfos;

    function init(
        address owner,
        string memory _name,
        string memory _baseURI
    ) external {
        initOwner(owner);
        name = _name;
        baseURI = _baseURI;
    }

    // ============ Event ============
    event RemoveNftToken(address nftContract, uint256 tokenId, uint256 amount);
    event AddNftToken(address nftContract, uint256 tokenId, uint256 amount);
    event CreateFragment();


    // ============ Ownable ============
    function directTransferOwnership(address newOwner) external onlyOwner {
        _OWNER_ = newOwner;
        emit OwnershipTransferred(_OWNER_, newOwner);
    }

    function createFragment(address nftProxy, bytes calldata data) external onlyOwner {
        require(nftProxy != address(0), "DODONftVault: PROXY_INVALID");
        _OWNER_ = nftProxy;
        (bool success, ) = nftProxy.call(data);
        require(success, "DODONftVault: TRANSFER_OWNER_FAILED");
        emit OwnershipTransferred(_OWNER_, nftProxy);
        emit CreateFragment();
    }

    function withdrawERC721(address nftContract, uint256 tokenId) external onlyOwner {
        _removeNftInfo(nftContract, tokenId, 1);
        IERC721(nftContract).safeTransferFrom(address(this), _OWNER_, tokenId, "");
    }

    function withdrawERC1155(address nftContract, uint256[] memory tokenIds, uint256[] memory amounts) external onlyOwner {
        require(tokenIds.length == amounts.length, "PARAMS_NOT_MATCH");
        for(uint256 i = 0; i < tokenIds.length; i++) {
            _removeNftInfo(nftContract, tokenIds[i], amounts[i]);
        }
        IERC1155(nftContract).safeBatchTransferFrom(address(this), _OWNER_, tokenIds, amounts, "");
    }

    // ============ View ============
    
    function getNftInfoById(uint256 i) external view returns (address nftContract, uint256 tokenId, uint256 amount) {
        require(i < nftInfos.length, "ID_OVERFLOW");
        NftInfo memory ni = nftInfos[i];
        nftContract = ni.nftContract;
        tokenId = ni.tokenId;
        amount = ni.amount;
    }

    function getIdByTokenIdAndAddr(address nftContract, uint256 tokenId) external view returns(uint256) {
        uint256 len = nftInfos.length;
        for (uint256 i = 0; i < len; i++) {
            if (nftContract == nftInfos[i].nftContract && tokenId == nftInfos[i].tokenId) {
                return i;
            }
        }
        require(false, "TOKEN_ID_NOT_FOUND");
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
        _addNftInfo(msg.sender, tokenId, 1);
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256 id,
        uint256 value,
        bytes calldata
    ) external override returns (bytes4){
        _addNftInfo(msg.sender, id, value);
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
            _addNftInfo(msg.sender, ids[i], values[i]);
        }
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    // ========== internal ===============
    function _addNftInfo(address nftContract, uint256 tokenId, uint256 addAmount) internal {
        uint256 len = nftInfos.length;
        for(uint256 i = 0; i < len; i++) {
            NftInfo memory nftInfo = nftInfos[i];
            if (nftContract == nftInfo.nftContract && tokenId == nftInfo.tokenId) {
                nftInfos[i].amount = nftInfo.amount.add(addAmount);
                emit AddNftToken(nftContract, tokenId, addAmount);
                return;
            }
        }
        nftInfos.push(
            NftInfo({   
                tokenId: tokenId,
                amount: addAmount,
                nftContract: nftContract
            })
        );
        emit AddNftToken(nftContract, tokenId, addAmount);
    }

    function _removeNftInfo(address nftContract, uint256 tokenId, uint256 removeAmount) internal {
        uint256 len = nftInfos.length;
        for (uint256 i = 0; i < len; i++) {
            NftInfo memory nftInfo = nftInfos[i];
            if (nftContract == nftInfo.nftContract && tokenId == nftInfo.tokenId) {
                if(removeAmount >= nftInfo.amount) {
                    if(i != len - 1) {
                        nftInfos[i] = nftInfos[len - 1];
                    }
                    nftInfos.pop();
                }else {
                    nftInfos[i].amount = nftInfo.amount.sub(removeAmount);
                }
                emit RemoveNftToken(nftContract, tokenId, removeAmount);
                break;
            }
        }
    }
}
