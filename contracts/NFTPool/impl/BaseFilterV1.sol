/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterAdmin} from "../intf/IFilterAdmin.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";

contract BaseFilterV1 is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    //=================== Storage ===================
    address public _NFT_COLLECTION_;
    uint256 public _NFT_ID_START_;
    uint256 public _NFT_ID_END_;
    
    //tokenId => isRegistered
    mapping(uint256 => bool) public _SPREAD_IDS_REGISTRY_;
    //tokenId => amount
    mapping(uint256 => uint256) public _NFT_RESERVE_;

    uint256[] public _NFT_IDS_;
    
    uint256 public _MAX_NFT_AMOUNT_;
    uint256 public _MIN_NFT_AMOUNT_;

    // GS -> Geometric sequence
    // CR -> Common Ratio

    //For NFT IN
    uint256 public _GS_START_IN_;
    uint256 public _CR_IN_;
    bool public _NFT_IN_SWITCH_ = false;
    
    //For NFT Random OUT
    uint256 public _GS_START_RANDOM_OUT_;
    uint256 public _CR_RANDOM_OUT_;
    bool public _NFT_RANDOM_SWITCH_ = false;

    //For NFT Target OUT
    uint256 public _GS_START_TARGET_OUT_;
    uint256 public _CR_TARGET_OUT_;
    bool public _NFT_TARGET_SWITCH_ = false;


    //==================== Query ==================

    function isNFTValid(address nftCollectionAddress, uint256 nftId) external view returns (bool) {
        if(nftCollectionAddress == _NFT_COLLECTION_) {
            return isNFTIDValid(nftId);
        } else {
            return false;
        }
    }

    function isNFTIDValid(uint256 nftId) public view returns(bool){
        if((nftId >= _NFT_ID_START_ && nftId <= _NFT_ID_END_) || _SPREAD_IDS_REGISTRY_[nftId]) {
                return true;
            } else {
                return false;
            }
    }

    function getAvaliableNFTIn() public view returns(uint256) {
        if(_MAX_NFT_AMOUNT_ <= _NFT_IDS_.length) {
            return 0;
        }else {
            return _MAX_NFT_AMOUNT_ - _NFT_IDS_.length;
        }
    }

    function getAvaliableNFTOut() public view returns(uint256) {
        if(_NFT_IDS_.length <= _MIN_NFT_AMOUNT_) {
            return 0;
        }else {
            return _NFT_IDS_.length - _MIN_NFT_AMOUNT_;
        }
    }

    function getNFTIndexById(uint256 tokenId) public view returns(uint256) {
        uint256 i = 0;
        for(; i < _NFT_IDS_.length; i++) {
            if(_NFT_IDS_[i] == tokenId) break;
        }
        require(i < _NFT_IDS_.length, "TOKEN_ID_NOT_EXSIT");
        return i;
    }

    // ============ Math =============

    function _geometricCalc(uint256 a1, uint256 q, uint256 start, uint256 end) internal view returns(uint256) {
        //Sn=a1*(q^n-1)/(q-1)
        //Sn-Sm = a1*(q^n-q^m)/(q-1)

        //q^n
        uint256 qn = DecimalMath.powFloor(q, end);
        //q^m
        uint256 qm = DecimalMath.powFloor(q, start);
        return a1.mul(qn.sub(qm)).div(q.sub(DecimalMath.ONE));
    }
    
    function _getRandomOutId() public view returns (uint256 index) {
        uint256 nftAmount = _NFT_IDS_.length;
        index = uint256(keccak256(abi.encodePacked(tx.origin, blockhash(block.number-1), gasleft()))) % nftAmount;
    }


    // ================= Ownable ================

    function changeNFTInPrice(uint256 newGsStart, uint256 newCr, bool switchFlag) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        _changeNFTInPrice(newGsStart, newCr, switchFlag);   
    }

    function _changeNFTInPrice(uint256 newGsStart, uint256 newCr, bool switchFlag) internal {
        if (!switchFlag) {
            _NFT_IN_SWITCH_ = false;
        } else {
            require(newCr > DecimalMath.ONE, "CR_INVALID");
            _GS_START_IN_ = newGsStart;
            _CR_IN_ = newCr;
            _NFT_IN_SWITCH_ = true;
        }
    }

    function changeNFTRandomInPrice(uint256 newGsStart, uint256 newCr, bool switchFlag) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        _changeNFTRandomInPrice(newGsStart, newCr, switchFlag);
    }

    function _changeNFTRandomInPrice(uint256 newGsStart, uint256 newCr, bool switchFlag) internal {
        if (!switchFlag) {
            _NFT_RANDOM_SWITCH_ = false;
        } else {
            require(newCr > DecimalMath.ONE, "CR_INVALID");
            _GS_START_RANDOM_OUT_ = newGsStart;
            _CR_RANDOM_OUT_ = newCr;
            _NFT_RANDOM_SWITCH_ = true;
        }
    }

    function changeNFTTargetOutPrice(uint256 newGsStart, uint256 newCr, bool switchFlag) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        _changeNFTTargetOutPrice(newGsStart, newCr, switchFlag);    
    }

    function _changeNFTTargetOutPrice(uint256 newGsStart, uint256 newCr, bool switchFlag) internal {
        if (!switchFlag) {
            _NFT_TARGET_SWITCH_ = false;
        } else {
            require(newCr > DecimalMath.ONE, "CR_INVALID");
            _GS_START_TARGET_OUT_ = newGsStart;
            _CR_TARGET_OUT_ = newCr;
            _NFT_TARGET_SWITCH_ = true;
        }
    }

    function changeNFTAmount(uint256 maxNFTAmount, uint256 minNFTAmount) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        _changeNFTAmount(maxNFTAmount, minNFTAmount);
    }

    function _changeNFTAmount(uint256 maxNFTAmount, uint256 minNFTAmount) internal {
        require(maxNFTAmount >= minNFTAmount, "AMOUNT_INVALID");
        _MAX_NFT_AMOUNT_ = maxNFTAmount;
        _MIN_NFT_AMOUNT_ = minNFTAmount;
    }

    function changeTokenIdRange(uint256 nftIdStart, uint256 nftIdEnd) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        _changeTokenIdRange(nftIdStart, nftIdEnd);
    }

    function _changeTokenIdRange(uint256 nftIdStart, uint256 nftIdEnd) internal {
        require(nftIdStart <= nftIdEnd, "TOKEN_RANGE_INVALID");
        
        _NFT_ID_START_ = nftIdStart;
        _NFT_ID_END_ = nftIdEnd;
    }

    function changeTokenIdMap(uint256[] memory tokenIds, bool[] memory isRegistrieds) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        _changeTokenIdMap(tokenIds, isRegistrieds);
    }

    function _changeTokenIdMap(uint256[] memory tokenIds, bool[] memory isRegistrieds) internal {
        require(tokenIds.length == isRegistrieds.length, "PARAM_NOT_MATCH");
        
        for(uint256 i = 0; i < tokenIds.length; i++) {
            _SPREAD_IDS_REGISTRY_[tokenIds[i]] = isRegistrieds[i];
        }
    }
}