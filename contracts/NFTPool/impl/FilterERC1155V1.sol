/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterAdmin} from "../intf/IFilterAdmin.sol";
import {IController} from "../intf/IController.sol";
import {IERC1155} from "../../intf/IERC1155.sol";
import {IERC1155Receiver} from "../../intf/IERC1155Receiver.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {BaseFilterV1} from "./BaseFilterV1.sol";

contract FilterERC1155V1 is IERC1155Receiver, BaseFilterV1 {
    using SafeMath for uint256;

    function init(
        address filterAdmin,
        address nftCollection,
        bool[] memory toggles,
        uint256[] memory numParams, //0 - startId, 1 - endId, 2 - maxAmount, 3 - minAmount
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) external {
        initOwner(filterAdmin);
        _NFT_COLLECTION_ = nftCollection;

        _changeNFTInPrice(priceRules[0], priceRules[1], toggles[0]);
        _changeNFTRandomInPrice(priceRules[2], priceRules[3], toggles[1]);
        _changeNFTTargetOutPrice(priceRules[4], priceRules[5], toggles[2]);

        _changeNFTAmountRange(numParams[2], numParams[3]);

        _changeTokenIdRange(numParams[0], numParams[1]);
        for (uint256 i = 0; i < spreadIds.length; i++) {
            _SPREAD_IDS_REGISTRY_[spreadIds[i]] = true;
        }
    }

    // ================= Trading ================

    function ERC1155In(uint256[] memory tokenIds, address to)
        external
        preventReentrant
        returns (uint256 received)
    {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(isNFTIDValid(tokenId), "NFT_ID_NOT_SUPPORT");
            totalAmount += _maintainERC1155In(tokenId);
        }
        (uint256 rawReceive, ) = queryNFTIn(totalAmount);
        received = IFilterAdmin(_OWNER_).mintFragTo(to, rawReceive);
    }

    function ERC1155TargetOut(
        uint256[] memory indexes,
        uint256[] memory amounts,
        address to
    ) external preventReentrant returns (uint256 paid) {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < indexes.length; i++) {
            totalAmount += amounts[i];
            _transferOutERC1155(to, indexes[i], amounts[i]);
        }
        (uint256 rawPay, ) = queryNFTTargetOut(totalAmount);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
    }

    function ERC1155RandomOut(uint256 amount, address to)
        external
        preventReentrant
        returns (uint256 paid)
    {
        (uint256 rawPay, ) = queryNFTRandomOut(amount);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
        for (uint256 i = 0; i < amount; i++) {
            uint256 randomNum = _getRandomNum() % _TOTAL_NFT_AMOUNT_;
            uint256 sum;
            for (uint256 j = 0; j < _NFT_IDS_.length; j++) {
                sum += _NFT_RESERVE_[_NFT_IDS_[j]];
                if (sum >= randomNum) {
                    _transferOutERC1155(to, j, 1);
                    break;
                }
            }
        }
    }

    // ============ Transfer =============

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function _transferOutERC1155(
        address to,
        uint256 index,
        uint256 amount
    ) internal {
        require(index < _NFT_IDS_.length, "INDEX_NOT_EXIST");
        uint256 tokenId = _NFT_IDS_[index];
        IERC1155(_NFT_COLLECTION_).safeTransferFrom(address(this), to, tokenId, amount, "");
        _maintainERC1155Out(index, tokenId);
    }

    function emergencyWithdraw(
        address[] memory nftContract,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        address to
    ) external onlySuperOwner {
        require(
            nftContract.length == tokenIds.length && nftContract.length == amounts.length,
            "PARAM_INVALID"
        );
        address controller = IFilterAdmin(_OWNER_)._CONTROLLER_();
        require(
            IController(controller).isEmergencyWithdrawOpen(address(this)),
            "EMERGENCY_WITHDRAW_NOT_OPEN"
        );

        for (uint256 i = 0; i < nftContract.length; i++) {
            uint256 tokenId = tokenIds[i];
            IERC1155(nftContract[i]).safeTransferFrom(address(this), to, tokenId, amounts[i], "");
            if (_NFT_RESERVE_[tokenId] > 0 && nftContract[i] == _NFT_COLLECTION_) {
                _maintainERC1155Out(getNFTIndexById(tokenId), tokenId);
            }
        }
    }

    function _maintainERC1155Out(uint256 index, uint256 tokenId) internal {
        uint256 currentAmount = IERC1155(_NFT_COLLECTION_).balanceOf(address(this), tokenId);
        uint256 outAmount = _NFT_RESERVE_[tokenId].sub(currentAmount);
        _NFT_RESERVE_[tokenId] = currentAmount;
        _TOTAL_NFT_AMOUNT_ -= outAmount;
        if (currentAmount == 0) {
            _NFT_IDS_[index] = _NFT_IDS_[_NFT_IDS_.length - 1];
            _NFT_IDS_.pop();
        }
    }

    function _maintainERC1155In(uint256 tokenId) internal returns (uint256 inAmount) {
        uint256 currentAmount = IERC1155(_NFT_COLLECTION_).balanceOf(address(this), tokenId);
        inAmount = currentAmount.sub(_NFT_RESERVE_[tokenId]);
        if (_NFT_RESERVE_[tokenId] == 0 && currentAmount > 0) {
            _NFT_IDS_.push(tokenId);
        }
        _NFT_RESERVE_[tokenId] = currentAmount;
        _TOTAL_NFT_AMOUNT_ += inAmount;
    }

    // ============ Support ============

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }

    function version() external pure virtual returns (string memory) {
        return "FILTER_1_ERC1155 1.0.0";
    }
}
