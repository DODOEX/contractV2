/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterAdmin} from "../intf/IFilterAdmin.sol";
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

    uint256 public _MAX_NFT_AMOUNT_;
    uint256 public _MIN_NFT_AMOUNT_;

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

    uint256[] public _TOKEN_IDS_;

    function init(
        address filterAdmin,
        address nftCollection,
        bool[] memory switches,
        uint256[] memory tokenRanges,
        uint256[] memory nftAmounts,
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) external {
        require(priceRules[1] != 0, "CR_IN_INVALID");
        require(priceRules[3] != 0, "CR_RANDOM_OUT_INVALID");
        require(priceRules[5] != 0, "CR_TARGET_OUT_INVALID");
        require(tokenRanges[1] >= tokenRanges[0], "TOKEN_RANGE_INVALID");
        require(nftAmounts[0] >= nftAmounts[1], "AMOUNT_INVALID");

        initOwner(filterAdmin);
        _NFT_COLLECTION_ = nftCollection;

        _TOKEN_ID_START_ = tokenRanges[0];
        _TOKEN_ID_END_ = tokenRanges[1];

        _MAX_NFT_AMOUNT_ = nftAmounts[0];
        _MIN_NFT_AMOUNT_ = nftAmounts[1];
        
        _GS_START_IN_ = priceRules[0];
        _CR_IN_ = priceRules[1];
        _NFT_IN_SWITCH_ = switches[0];

        _GS_START_RANDOM_OUT_ = priceRules[2];
        _CR_RANDOM_OUT_ = priceRules[3];
        _NFT_RANDOM_SWITCH_ = switches[1];

        _GS_START_TARGET_OUT_ = priceRules[4];
        _CR_TARGET_OUT_ = priceRules[5];
        _NFT_TARGET_SWITCH_ = switches[2];

        for(uint256 i = 0; i < spreadIds.length; i++) {
            _SPREAD_IDS_REGISTRY_[spreadIds[i]] = true;
        }
    }

    //==================== View ==================
    function isFilterERC721Pass(address nftCollectionAddress, uint256 nftId) external view returns (bool) {
        if(nftCollectionAddress == _NFT_COLLECTION_) {
            if((nftId >= _TOKEN_ID_START_ && nftId <= _TOKEN_ID_END_) || _SPREAD_IDS_REGISTRY_[nftId]) {
                return true;
            } else {
                return false;
            }
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

    function getNFTInPrice(address, uint256) external view returns(uint256) {
        (uint256 price, ) = geometricCalc(_GS_START_IN_,_CR_IN_, _TOKEN_IDS_.length);
        return price;
    }

    function getNFTRandomOutPrice() external view returns (uint256) {
        require(_TOKEN_IDS_.length != 0, "EMPTY");

        (uint256 price, ) = geometricCalc(_GS_START_RANDOM_OUT_,_CR_RANDOM_OUT_, _TOKEN_IDS_.length);
        return price;
    }

    function getNFTTargetOutPrice(address, uint256) external view returns (uint256) {
        require(_TOKEN_IDS_.length != 0, "EMPTY");

        (uint256 price, ) = geometricCalc(_GS_START_TARGET_OUT_,_CR_TARGET_OUT_, _TOKEN_IDS_.length);
        return price;
    }

    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId;
    }

    //Pseudorandomness
    function getRandomOutId() external view returns (address nftCollection, uint256 nftId) {
        uint256 nftAmount = _TOKEN_IDS_.length;
        uint256 idx = uint256(keccak256(abi.encodePacked(blockhash(block.number-1), gasleft(), msg.sender, nftAmount))) % nftAmount;
        nftCollection = _NFT_COLLECTION_;
        nftId = _TOKEN_IDS_[idx];
    }


    function getTotalNFTInPrice(uint256 amount) external view returns (uint256 totalPrice) {
        require(amount <= getAvaliableNFTIn(), "EXCEDD_IN_AMOUNT");

        (uint256 base, ) = geometricCalc(_GS_START_IN_,_CR_IN_, _TOKEN_IDS_.length);
        (, totalPrice) = geometricCalc(base, _CR_IN_, amount);
    }

    function getTotalTargetNFTOutPrice(uint256 amount) external view returns (uint256 totalPrice) {
        require(amount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");

        (uint256 base, ) = geometricCalc(_GS_START_TARGET_OUT_,_CR_TARGET_OUT_, _TOKEN_IDS_.length);
        (, totalPrice) = geometricCalc(base, _CR_TARGET_OUT_, amount);
    }

    function getTotalRandomNFTOutPrice(uint256 amount) external view returns (uint256 totalPrice) {
        require(amount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");

        (uint256 base, ) = geometricCalc(_GS_START_RANDOM_OUT_,_CR_RANDOM_OUT_, _TOKEN_IDS_.length);
        (, totalPrice) = geometricCalc(base, _CR_RANDOM_OUT_, amount);
    }

    function version() virtual external pure returns (string memory) {
        return "FILTER_01 1.0.0";
    }

    // ================= Ownable ================
    function transferOutERC721(address nftContract, address assetTo, uint256 nftId) external onlyOwner {
        require(nftContract == _NFT_COLLECTION_, "WRONG_NFT_COLLECTION");
        uint256[] memory tokenIds = _TOKEN_IDS_;
        uint256 i;
        for (; i < tokenIds.length; i++) {
            if (tokenIds[i] == nftId) {
                tokenIds[i] = tokenIds[tokenIds.length - 1];
                break;
            }
        }
        require(i < tokenIds.length, "NOT_EXIST_ID");
        _TOKEN_IDS_ = tokenIds;
        _TOKEN_IDS_.pop();
        
        IERC721(nftContract).safeTransferFrom(address(this), assetTo, nftId);
    }

    function transferInERC721(address nftContract, address assetFrom, uint256 nftId) external onlyOwner {
        require(nftContract == _NFT_COLLECTION_, "WRONG_NFT_COLLECTION");
        uint256 i;
        for(; i < _TOKEN_IDS_.length; i++) {
            if(_TOKEN_IDS_[i] == nftId) break;
        }
        require(i == _TOKEN_IDS_.length, "EXIST_ID");
        
        _TOKEN_IDS_.push(nftId);
        IERC721(nftContract).safeTransferFrom(assetFrom, address(this), nftId);
    }

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
}