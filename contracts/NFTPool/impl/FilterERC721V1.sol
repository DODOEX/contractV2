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
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";

contract FilterERC721V1 is InitializableOwnable, IERC721Receiver, ReentrancyGuard {
    using SafeMath for uint256;

    //=================== Storage ===================
    address public _NFT_COLLECTION_;
    uint256 public _NFT_ID_START_;
    uint256 public _NFT_ID_END_;
    
    //tokenId => isRegistered
    mapping(uint256 => bool) public _SPREAD_IDS_REGISTRY_;
    //tokenId => 1
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

    function init(
        address filterAdmin,
        address nftCollection,
        bool[] memory switches,
        uint256[] memory tokenRanges,
        uint256[] memory nftAmounts,
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) external {
        initOwner(filterAdmin);
        _NFT_COLLECTION_ = nftCollection;

        _changeNFTInPrice(priceRules[0],priceRules[1],switches[0]);
        _changeNFTRandomInPrice(priceRules[2],priceRules[3],switches[1]);
        _changeNFTTargetOutPrice(priceRules[4],priceRules[5],switches[2]);

        _changeNFTAmount(nftAmounts[0],nftAmounts[1]);

        _changeTokenIdRange(tokenRanges[0],tokenRanges[1]);
        for(uint256 i = 0; i < spreadIds.length; i++) {
            _SPREAD_IDS_REGISTRY_[spreadIds[i]] = true;
        }
    }

    //==================== Query ==================

    function isNFTValid(address nftCollectionAddress, uint256 nftId) external view returns (bool) {
        if(nftCollectionAddress == _NFT_COLLECTION_) {
            isNFTIDValid(nftId);
        } else {
            return false;
        }
    }

    function isNFTIDValid(uint256 nftId) public view returns(bool) {
        if((nftId >= _NFT_ID_START_ && nftId <= _NFT_ID_END_) || _SPREAD_IDS_REGISTRY_[nftId]) {
            return true;
        } else {
            return false;
        }
    }

    function getAvaliableNFTIn() public view returns(uint256) {
        if(_MAX_NFT_AMOUNT_ < _NFT_IDS_.length) {
            return 0;
        }else {
            return _MAX_NFT_AMOUNT_ - _NFT_IDS_.length;
        }
    }

    function getAvaliableNFTOut() public view returns(uint256) {
        if(_NFT_IDS_.length < _MIN_NFT_AMOUNT_) {
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

    function queryNFTIn(uint256 NFTInAmount) public view returns (uint256 rawReceive, uint256 received) {
        require(NFTInAmount <= getAvaliableNFTIn(), "EXCEDD_IN_AMOUNT");
        uint256 nftAmount = _NFT_IDS_.length;
        rawReceive = geometricCalc(_GS_START_IN_, _CR_IN_, nftAmount, nftAmount + NFTInAmount);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeMintFee(rawReceive);
        received = rawReceive.sub(poolFee).sub(mtFee);
    }

    function queryNFTTargetOut(uint256 NFTOutAmount) public view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        uint256 nftAmount = _NFT_IDS_.length;
        rawPay = geometricCalc(_GS_START_TARGET_OUT_,_CR_TARGET_OUT_, nftAmount - NFTOutAmount, nftAmount);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeBurnFee(rawPay);
        pay = rawPay.add(poolFee).add(mtFee);
    }

    function queryNFTRandomOut(uint256 NFTOutAmount) public view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        uint256 nftAmount = _NFT_IDS_.length;
        rawPay = geometricCalc(_GS_START_RANDOM_OUT_,_CR_RANDOM_OUT_, nftAmount - NFTOutAmount, nftAmount);
        (uint256 poolFee, uint256 mtFee) = IFilterAdmin(_OWNER_).queryChargeBurnFee(rawPay);
        pay = rawPay.add(poolFee).add(mtFee);
    }

    // ================= Trading ================

    function ERC721In(uint256[] memory tokenIds, address to) external preventReentrant returns(uint256 received) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_NFT_RESERVE_[tokenIds[i]] == 0 && IERC721(_NFT_COLLECTION_).ownerOf(tokenIds[i])==address(this), "NFT_NOT_SEND");
            _NFT_IDS_.push(tokenIds[i]);
            _NFT_RESERVE_[tokenIds[i]] = 1;
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
            _transferOutERC721(to, getRandomOutId());
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


    // ============ Math =============

    function geometricCalc(uint256 a1, uint256 q, uint256 start, uint256 end) internal view returns(uint256) {
        //Sn=a1*(q^n-1)/(q-1)
        //Sn-Sm = a1*(q^n-q^m)/(q-1)

        //q^n
        uint256 qn = DecimalMath.powFloor(q, end);
        //q^m
        uint256 qm = DecimalMath.powFloor(q, start);
        return a1.mul(qn.sub(qm)).div(q.sub(DecimalMath.ONE));
    }
    
    function getRandomOutId() public view returns (uint256 index) {
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

    // ============ Support ============

    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId;
    }

    function version() virtual external pure returns (string memory) {
        return "FILTER_1_ERC721 1.0.0";
    }

}