/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterAdmin} from "../intf/IFilterAdmin.sol";
import {IControllerModel} from "../intf/IControllerModel.sol";
import {IERC721} from "../../intf/IERC721.sol";
import {IERC721Receiver} from "../../intf/IERC721Receiver.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {BaseFilterV1} from "./BaseFilterV1.sol";

contract FilterERC721V1 is IERC721Receiver, BaseFilterV1 {
    using SafeMath for uint256;

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
        uint256 nftAmount = _NFT_IDS_.length;
        rawReceive = _geometricCalc(_GS_START_IN_, _CR_IN_, nftAmount, nftAmount + NFTInAmount);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeMintFee(rawReceive);
        received = rawReceive.sub(poolFee).sub(mtFee);
    }

    function queryNFTTargetOut(uint256 NFTOutAmount) public view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        uint256 nftAmount = _NFT_IDS_.length;
        rawPay = _geometricCalc(_GS_START_TARGET_OUT_,_CR_TARGET_OUT_, nftAmount - NFTOutAmount, nftAmount);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeBurnFee(rawPay);
        pay = rawPay.add(poolFee).add(mtFee);
    }

    function queryNFTRandomOut(uint256 NFTOutAmount) public view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        uint256 nftAmount = _NFT_IDS_.length;
        rawPay = _geometricCalc(_GS_START_RANDOM_OUT_,_CR_RANDOM_OUT_, nftAmount - NFTOutAmount, nftAmount);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeBurnFee(rawPay);
        pay = rawPay.add(poolFee).add(mtFee);
    }

    // ================= Trading ================

    function ERC721In(uint256[] memory tokenIds, address to) external preventReentrant returns(uint256 received) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(isNFTIDValid(tokenId), "NFT_ID_NOT_SUPPORT");
            require(_NFT_RESERVE_[tokenId] == 0 && IERC721(_NFT_COLLECTION_).ownerOf(tokenId) == address(this), "NFT_NOT_SEND");
            _NFT_IDS_.push(tokenId);
            _NFT_RESERVE_[tokenId] = 1;
        }
        (uint256 rawReceive,) = queryNFTIn(tokenIds.length);
        received = IFilterAdmin(_OWNER_).mintFragTo(to, rawReceive);
    }

    function ERC721TargetOut(uint256[] memory indexes, address to) external preventReentrant returns(uint256 paid) {
        (uint256 rawPay, ) = queryNFTTargetOut(indexes.length);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
        for (uint256 i = 0; i < indexes.length; i++) {
            _transferOutERC721(to, indexes[i]);
        }
    }

    function ERC721RandomOut(uint256 amount, address to) external preventReentrant returns (uint256 paid) {
        (uint256 rawPay, ) = queryNFTRandomOut(amount);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
        for (uint256 i = 0; i < amount; i++) {
            _transferOutERC721(to, _getRandomOutId());
        }
    }

    // ============ Transfer =============

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _transferOutERC721(address to, uint256 index) internal { 
        require(index < _NFT_IDS_.length, "INDEX_NOT_EXIST");
        uint256 tokenId = _NFT_IDS_[index];
        IERC721(_NFT_COLLECTION_).safeTransferFrom(address(this), to, tokenId);
        _NFT_IDS_[index] = _NFT_IDS_[_NFT_IDS_.length - 1];
        _NFT_IDS_.pop();
        _NFT_RESERVE_[tokenId] = 0;
    }

    function emergencyWithdraw(address[] memory nftContract, uint256[] memory tokenIds, address to) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(nftContract.length == tokenIds.length, "PARAM_INVALID");
        address controllerModel = IFilterAdmin(_OWNER_)._CONTROLLER_MODEL_();
        require(IControllerModel(controllerModel).getEmergencySwitch(address(this)), "NOT_OPEN");

        for(uint256 i = 0; i< nftContract.length; i++) {
            if(_NFT_RESERVE_[tokenIds[i]] == 1 && nftContract[i] == _NFT_COLLECTION_){
                uint256 index = getNFTIndexById(tokenIds[i]);
                _NFT_IDS_[index] = _NFT_IDS_[_NFT_IDS_.length - 1];
                _NFT_IDS_.pop();
                _NFT_RESERVE_[tokenIds[i]] = 0;
            }
            IERC721(nftContract[i]).safeTransferFrom(address(this), to, tokenIds[i]);
        }
    }

    // ============ Support ============

    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId;
    }

    function version() virtual external pure returns (string memory) {
        return "FILTER_1_ERC721 1.0.0";
    }

}