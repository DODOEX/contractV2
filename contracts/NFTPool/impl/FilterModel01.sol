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
import {IERC721} from "../../intf/IERC721.sol";
import {IERC721Receiver} from "../../intf/IERC721Receiver.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";


contract FilterModel01 is InitializableOwnable, IERC721Receiver {
    using SafeMath for uint256;

    //=================== Storage ===================
    address public _NFT_COLLECTION_;
    uint256 public _TOKEN_ID_START_;
    uint256 public _TOKEN_ID_END_;

    //tokenId => isRegistered
    mapping(uint256 => bool) public _SPREAD_IDS_REGISTRY_;

    //For NFT IN
    uint256 public _GS_START_IN_;
    uint256 public _CR_IN_;
    bool public _NFT_IN_SWITCH_ = true;
    
    //For NFT Random OUT
    uint256 public _GS_START_RANDOM_OUT_;
    uint256 public _CR_RANDOM_OUT_;
    bool public _NFT_RANDOM_SWITCH_ = true;

    //For NFT Target OUT
    uint256 public _GS_START_TARGET_OUT_;
    uint256 public _CR_TARGET_OUT_;
    bool public _NFT_TARGET_SWITCH_ = true;

    mapping(uint256=>uint256) public _INTERNAL_TOKEN_IDS_;
    uint256 public _NFT_AMOUNT_;
    uint256 public _MAX_NFT_AMOUNT_;
    uint256 public _MIN_NFT_AMOUNT_;

    function init(
        address filterAdmin,
        address nftCollection,
    ) external {
        initOwner(filterAdmin);
        _NFT_COLLECTION_ = nftCollection;
    }

    //==================== View ==================

    function isNFTValid(address nftCollectionAddress, uint256 nftId) external view returns (bool) {
        if(nftCollectionAddress == _NFT_COLLECTION_) {
            isIDValid(nftId);
        } else {
            return false;
        }
    }

    function isIDValid(uint256 nftId) public view returns(bool){
        if((nftId >= _TOKEN_ID_START_ && nftId <= _TOKEN_ID_END_) || _SPREAD_IDS_REGISTRY_[nftId]) {
                return true;
            } else {
                return false;
            }
    }

    function getAvaliableNFTIn() public view returns(uint256) {
        if(_MAX_NFT_AMOUNT_ < _TOKEN_IDS_.length) {
            return 0;
        }else {
            return _MAX_NFT_AMOUNT_ - _TOKEN_IDS_.length;
        }
    }

    function getAvaliableNFTOut() public view returns(uint256) {
        if(_TOKEN_IDS_.length < _MIN_NFT_AMOUNT_) {
            return 0;
        }else {
            return _TOKEN_IDS_.length - _MIN_NFT_AMOUNT_;
        }
    }

    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId;
    }

    function queryNFTIn(uint256 NFTInAmount) external view returns (uint256 rawReceive, uint256 receive) {
        require(NFTInAmount <= getAvaliableNFTIn(), "EXCEDD_IN_AMOUNT");
        rawReceive = geometricCalc(_GS_START_IN_, _CR_IN_, _TOKEN_IDS_.length, _TOKEN_IDS_.length+amount);
        receive = IFilterAdmin(_OWNER_).chargeMintFee(rawReceive);
    }

    function queryNFTTargetOut(uint256 NFTOutAmount) external view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        rawPay = geometricCalc(_GS_START_TARGET_OUT_,_CR_TARGET_OUT_, _TOKEN_IDS_.length-NFTOutAmount,_TOKEN_IDS_.length);
        pay = IFilterAdmin(_OWNER_).chargeBurnFee(rawPay);
    }

    function queryNFTRandomOut(uint256 NFTOutAmount) external view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        rawPay = geometricCalc(_GS_START_RANDOM_OUT_,_CR_RANDOM_OUT_, _TOKEN_IDS_.length-NFTOutAmount,_TOKEN_IDS_.length);
        pay = IFilterAdmin(_OWNER_).chargeBurnFee(rawPay);
    }

    function version() virtual external pure returns (string memory) {
        return "FILTER_1_ERC721 1.0.0";
    }

    // ================= Trading ================

    function ERC721In(uint256[] memory tokenIds, address to) external returns(uint256 received) {
        (uint256 rawReceive,) = queryNFTIn(tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            IFilterAdmin(_OWNER_).transferNFT(msg.sender, _NFT_COLLECTION_, tokenIds[i]);
            _INTERNAL_TOKEN_IDS_[_NFT_AMOUNT_+i] = tokenIds[i];
        }
        _NFT_AMOUNT_ += tokenIds.length;
        received = IFilterAdmin(_OWNER_).mintFragTo(to, rawReceive);
    }

    function ERC721TargetOut(uint256[] memory internalIDs, address to) external returns(uint256 paid) {
        (uint256 rawPay, ) = queryNFTOut(tokenIds.length);
        for (uint256 index = 0; index < array.length; index++) {
            uint256 tokenId = _INTERNAL_TOKEN_IDS_[internalIDs[i]];
            require(isIDValid(tokenId), "NFT_NOT_LISTED");
            _transferOutERC721(to, tokenId, internalIDs[i]);
        }
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
    }

    function ERC721RandomOut(uint256 number, address to) external returns (uint256 paid) {}

    function _transferOutERC721(address to, uint256 tokenId, uint256 internalId) internal { 
        IERC721(_NFT_COLLECTION_).safeTransfer(to, tokenId);
        _INTERNAL_TOKEN_IDS_[internalId] = _INTERNAL_TOKEN_IDS_[_NFT_AMOUNT_-1];
        _NFT_AMOUNT_-=1;
    }

    // ================= Ownable ================

    function changeNFTInPrice(uint256 newGsStart, uint256 newCr) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(newCr != 0, "CR_ZERO");
        _GS_START_IN_ = newGsStart;
        _CR_IN_ = newCr;
    }

    function changeNFTROutPrice(uint256 newGsStart, uint256 newCr) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(newCr != 0, "CR_ZERO");
        _GS_START_RANDOM_OUT_ = newGsStart;
        _CR_RANDOM_OUT_ = newCr;
    }

    function changeNFTTOutPrice(uint256 newGsStart, uint256 newCr) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(newCr != 0, "CR_ZERO");
        _GS_START_TARGET_OUT_ = newGsStart;
        _CR_TARGET_OUT_ = newCr;
    }

    function changeNFTAmount(uint256 maxNFTAmount, uint256 minNFTAmount) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(maxNFTAmount >= minNFTAmount, "AMOUNT_INVALID");
        _MAX_NFT_AMOUNT_ = maxNFTAmount;
        _MIN_NFT_AMOUNT_ = minNFTAmount;
    }

    function changeSwitches(
        bool newNFTInSwitch,
        bool newNFTRandomSwitch,
        bool newNFTTargetSwitch
    ) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        _NFT_IN_SWITCH_ = newNFTInSwitch;
        _NFT_RANDOM_SWITCH_ = newNFTRandomSwitch;
        _NFT_TARGET_SWITCH_ = newNFTTargetSwitch;
    }

    function changeTokenIdRange(uint256 tokenIdStart, uint256 tokenIdEnd) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(tokenIdStart <= tokenIdEnd, "TOKEN_RANGE_INVALID");
        
        _TOKEN_ID_START_ = tokenIdStart;
        _TOKEN_ID_END_ = tokenIdEnd;
    }

    function changeTokenIdMap(uint256[] memory tokenIds, bool[] memory isRegistrieds) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(tokenIds.length == isRegistrieds.length, "PARAM_NOT_MATCH");
        
        for(uint256 i = 0; i < tokenIds.length; i++) {
            _SPREAD_IDS_REGISTRY_[tokenIds[i]] = isRegistrieds[i];
        }
    }

    function emergencyWithdraw(address[] memory nftContract, uint256[] memory tokenIds, address assetTo) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(nftContract.length == tokenIds.length, "PARAM_INVALID");
        address controllerModel = IFilterAdmin(_OWNER_)._CONTROLLER_MODEL_();
        require(IControllerModel(controllerModel).getEmergencySwitch(address(this)), "NOT_OPEN");

        for(uint256 i = 0; i< nftContract.length; i++) {
            if(nftContract[i] == _NFT_COLLECTION_) {
                removeTokenId(tokenIds[i]);
            }
            IERC721(nftContract[i]).safeTransferFrom(address(this), assetTo, tokenIds[i]);
        }
    }

    // ============ Callback ============
    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ============ Internal =============
    function geometricCalc(uint256 base, uint256 ratio, uint256 times) internal view returns(uint256 newBase, uint256 sum) {
        sum = 0;
        for(uint256 i = 0; i < times; i++) {
            base = DecimalMath.mulFloor(base, ratio);
            sum = sum.add(base);
        }
        newBase = base;
    }

    function removeTokenId(uint256 id) internal returns(bool){
        uint256[] memory tokenIds = _TOKEN_IDS_;
        uint256 i;
        for (; i < tokenIds.length; i++) {
            if (tokenIds[i] == id) {
                tokenIds[i] = tokenIds[tokenIds.length - 1];
                break;
            }
        }
        if(i < tokenIds.length) {
            _TOKEN_IDS_ = tokenIds;
            _TOKEN_IDS_.pop();
            return true;
        }else {
            return false;
        }
    }
}    //Pseudorandomness
    function getRandomOutId() external view returns (address nftCollection, uint256 nftId) {
        uint256 nftAmount = _TOKEN_IDS_.length;
        uint256 sumSeed;
        for(uint256 i = 0; i < gasleft() % 10; i++) {
            sumSeed = sumSeed.add(uint256(keccak256(abi.encodePacked(blockhash(block.number-1), gasleft(), msg.sender, nftAmount))));
        }
        uint256 idx = sumSeed % nftAmount;
        nftCollection = _NFT_COLLECTION_;
        nftId = _TOKEN_IDS_[idx];
    }