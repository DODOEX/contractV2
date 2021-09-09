/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterAdmin} from "../intf/IFilterAdmin.sol";
import {IControllerModel} from "../intf/IControllerModel.sol";
import {IERC1155} from "../../intf/IERC1155.sol";
import {IERC1155Receiver} from "../../intf/IERC1155Receiver.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {BaseFilterV1} from "./BaseFilterV1.sol";

contract FilterERC1155V1 is IERC1155Receiver, BaseFilterV1 {
    using SafeMath for uint256;

    //=================== Storage ===================    
    uint256 public _TOTAL_NFT_AMOUNT_;

    function init(
        address filterAdmin,
        address nftCollection,
        bool[] memory switches,
        uint256[] memory numParams, //0 - startId, 1 - endId, 2 - maxAmount, 3 - minAmount
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) external {
        initOwner(filterAdmin);
        _NFT_COLLECTION_ = nftCollection;

        _changeNFTInPrice(priceRules[0],priceRules[1],switches[0]);
        _changeNFTRandomInPrice(priceRules[2],priceRules[3],switches[1]);
        _changeNFTTargetOutPrice(priceRules[4],priceRules[5],switches[2]);

        _changeNFTAmount(numParams[2],numParams[3]);

        _changeTokenIdRange(numParams[0],numParams[1]);
        for(uint256 i = 0; i < spreadIds.length; i++) {
            _SPREAD_IDS_REGISTRY_[spreadIds[i]] = true;
        }
    }

    //==================== Query ==================

    function queryNFTIn(uint256 NFTInAmount) public view returns (uint256 rawReceive, uint256 received) {
        require(NFTInAmount <= getAvaliableNFTIn(), "EXCEDD_IN_AMOUNT");
        rawReceive = geometricCalc(_GS_START_IN_, _CR_IN_, _TOTAL_NFT_AMOUNT_, _TOTAL_NFT_AMOUNT_ + NFTInAmount);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeMintFee(rawReceive);
        received = rawReceive.sub(poolFee).sub(mtFee);
    }

    function queryNFTTargetOut(uint256 NFTOutAmount) public view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        rawPay = geometricCalc(_GS_START_TARGET_OUT_,_CR_TARGET_OUT_, _TOTAL_NFT_AMOUNT_ - NFTOutAmount, _TOTAL_NFT_AMOUNT_);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeBurnFee(rawPay);
        pay = rawPay.add(poolFee).add(mtFee);
    }

    function queryNFTRandomOut(uint256 NFTOutAmount) public view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        rawPay = geometricCalc(_GS_START_RANDOM_OUT_,_CR_RANDOM_OUT_, _TOTAL_NFT_AMOUNT_ - NFTOutAmount, _TOTAL_NFT_AMOUNT_);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeBurnFee(rawPay);
        pay = rawPay.add(poolFee).add(mtFee);
    }

    // ================= Trading ================

    function ERC1155In(uint256[] memory tokenIds, address to) external preventReentrant returns(uint256 received) {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(isNFTIDValid(tokenId), "NFT_ID_NOT_SUPPORT");
            totalAmount += _maintainERC1155In(tokenId);
        }
        (uint256 rawReceive,) = queryNFTIn(totalAmount);
        received = IFilterAdmin(_OWNER_).mintFragTo(to, rawReceive);
    }

    function ERC1155TargetOut(uint256[] memory indexes, uint256[] memory amounts, address to) external preventReentrant returns(uint256 paid) {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < indexes.length; i++) {
            _transferOutERC1155(to, indexes[i], amounts[i]);
        }
        (uint256 rawPay, ) = queryNFTTargetOut(totalAmount);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
    }

    function ERC1155RandomOut(uint256 amount, address to) external preventReentrant returns (uint256 paid) {
        (uint256 rawPay, ) = queryNFTRandomOut(amount);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
        for (uint256 i = 0; i < amount; i++) {
            _transferOutERC1155(to, getRandomOutId(), 1);
        }
    }

    // ============ Transfer =============

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external override returns (bytes4){
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external override returns (bytes4){
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function _transferOutERC1155(address to, uint256 index, uint256 amount) internal { 
        require(index < _NFT_IDS_.length, "INDEX_NOT_EXIST");
        uint256 tokenId = _NFT_IDS_[index];
        IERC1155(_NFT_COLLECTION_).safeTransferFrom(address(this), to, tokenId, amount, "");
        _maintainERC1155Out(index, tokenId);
    }

    function emergencyWithdraw(address[] memory nftContract, uint256[] memory tokenIds, uint256[] memory amounts, address to) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(nftContract.length == tokenIds.length, "PARAM_INVALID");
        require(nftContract.length == amounts.length, "PARAM_INVALID");
        address controllerModel = IFilterAdmin(_OWNER_)._CONTROLLER_MODEL_();
        require(IControllerModel(controllerModel).getEmergencySwitch(address(this)), "NOT_OPEN");

        for(uint256 i = 0; i< nftContract.length; i++) {
            uint256 tokenId = tokenIds[i];
            IERC1155(nftContract[i]).safeTransferFrom(address(this), to, tokenId, amounts[i], "");
            if(isNFTIDValid(tokenId) && nftContract[i] == _NFT_COLLECTION_){
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

    function _maintainERC1155In(uint256 tokenId) internal returns(uint256 inAmount){
        uint256 currentAmount = IERC1155(_NFT_COLLECTION_).balanceOf(address(this), tokenId);
        inAmount = currentAmount.sub(_NFT_RESERVE_[tokenId]);
        if(_NFT_RESERVE_[tokenId]==0 && currentAmount > 0) {
            _NFT_IDS_.push(tokenId);
        }
        _NFT_RESERVE_[tokenId] = currentAmount;
        _TOTAL_NFT_AMOUNT_ += inAmount;
    }

    // ============ Support ============

    function supportsInterface(bytes4 interfaceId) override public view returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }


    function version() virtual external pure returns (string memory) {
        return "FILTER_1_ERC1155 1.0.0";
    }
}