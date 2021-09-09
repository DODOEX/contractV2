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
    uint256 public _NFT_ID_START_;
    uint256 public _NFT_ID_END_;
    
    //tokenId => isRegistered
    mapping(uint256 => bool) public _SPREAD_IDS_REGISTRY_;
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
    ) external {
        initOwner(filterAdmin);
        _NFT_COLLECTION_ = nftCollection;
    }

    //==================== Query ==================

    function isNFTValid(address nftCollectionAddress, uint256 nftId) external view returns (bool) {
        if(nftCollectionAddress == _NFT_COLLECTION_) {
            isNFTIDValid(nftId);
        } else {
            return false;
        }
    }

    function isNFTIDValid(uint256 nftId) public view returns(bool){
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

    function queryNFTIn(uint256 NFTInAmount) external view returns (uint256 rawReceive, uint256 receive) {
        require(NFTInAmount <= getAvaliableNFTIn(), "EXCEDD_IN_AMOUNT");
        rawReceive = geometricCalc(_GS_START_IN_, _CR_IN_, _NFT_AMOUNT_, _NFT_AMOUNT_+NFTInAmount);
        receive = IFilterAdmin(_OWNER_).queryChargeMintFee(rawReceive);
    }

    function queryNFTTargetOut(uint256 NFTOutAmount) external view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        rawPay = geometricCalc(_GS_START_TARGET_OUT_,_CR_TARGET_OUT_, _NFT_AMOUNT_-NFTOutAmount,_NFT_AMOUNT_);
        pay = IFilterAdmin(_OWNER_).queryChargeBurnFee(rawPay);
    }

    function queryNFTRandomOut(uint256 NFTOutAmount) external view returns (uint256 rawPay, uint256 pay) {
        require(NFTOutAmount <= getAvaliableNFTOut(), "EXCEED_OUT_AMOUNT");
        rawPay = geometricCalc(_GS_START_RANDOM_OUT_,_CR_RANDOM_OUT_, _NFT_AMOUNT_-NFTOutAmount,_NFT_AMOUNT_);
        pay = IFilterAdmin(_OWNER_).chargeBurnFee(rawPay);
    }

    // ================= Trading ================

    function ERC721In(uint256[] memory tokenIds, address to) external preventReentrant returns(uint256 received) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(!_NFT_RESERVE_[tokenIds[i]] && IERC721(_NFT_COLLECTION_).ownerOf(tokenIds[i])==address(this), "NFT_NOT_SEND");
            _NFT_IDS_.push(tokenId);
            _NFT_RESERVE_[tokenIds[i]] = 1;
        }
        (uint256 rawReceive,) = queryNFTIn(tokenIds.length);
        received = IFilterAdmin(_OWNER_).mintFragTo(to, rawReceive);
    }

    function ERC721TargetOut(uint256[] memory indexes, address to) external preventReentrant returns(uint256 paid) {
        (uint256 rawPay, ) = queryNFTOut(tokenIds.length);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
        for (uint256 i = 0; i < indexes.length; i++) {
            _transferOutERC721(to, indexes[i]);
        }
    }

    function ERC721RandomOut(uint256 amount, address to) external preventReentrant returns (uint256 paid) {
        (uint256 rawPay, ) = queryNFTOut(amount);
        paid = IFilterAdmin(_OWNER_).burnFragFrom(msg.sender, rawPay);
        for (uint256 i = 0; i < amount; i++) {
            _transferOutERC721(to, getRandomOutId());
        }
    }

    // ============ Transfer =============

    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _transferOutERC721(address to, uint256 index) internal { 
        require(index<_TOKEN_IDS_.length, "INDEX_NOT_EXIST");
        uint256 tokenId = _TOKEN_IDS_[index];
        IERC721(_NFT_COLLECTION_).safeTransfer(to, tokenId);
        _TOKEN_IDS_[index] = _TOKEN_IDS_[_TOKEN_IDS_.length - 1];
        _TOKEN_IDS_.pop();
        _NFT_RESERVE_[tokenId] = 0;
    }

    function emergencyWithdraw(address[] memory nftContract, uint256[] memory tokenIds, address to) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(nftContract.length == tokenIds.length, "PARAM_INVALID");
        address controllerModel = IFilterAdmin(_OWNER_)._CONTROLLER_MODEL_();
        require(IControllerModel(controllerModel).getEmergencySwitch(address(this)), "NOT_OPEN");

        for(uint256 i = 0; i< nftContract.length; i++) {
            if(_NFT_RESERVE_[tokenIds[i]] && nftContract[i]==_NFT_COLLECTION_){
                uint256 index = getNFTIndex(tokenIds[i]);
                _TOKEN_IDS_[index] = _TOKEN_IDS_[_TOKEN_IDS_.length - 1];
                _TOKEN_IDS_.pop();
                _NFT_RESERVE_[tokenId] = 0;
            }
            IERC721(nftContract[i]).safeTransfer(to, tokenId);
        }
    }


    // ============ Math =============

    function geometricCalc(uint256 base, uint256 ratio, uint256 times) internal view returns(uint256 newBase, uint256 sum) {
        sum = 0;
        for(uint256 i = 0; i < times; i++) {
            base = DecimalMath.mulFloor(base, ratio);
            sum = sum.add(base);
        }
        newBase = base;
    }
    
    function getRandomOutId() external view returns (uint256 index) {
        uint256 nftAmount = _TOKEN_IDS_.length;
        index = uint256(keccak256(abi.encodePacked(tx.origin, blockhash(block.number-1), gasleft()))) % nftAmount;
    }


    // ================= Ownable ================

    function changeNFTInPrice(uint256 newGsStart, uint256 newCr, bool switch) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        if (!switch) {
            _NFT_IN_SWITCH_ = false;
        } else {
            require(newCr>DecimalMath.ONE, "CR_ZERO");
            _GS_START_IN_ = newGsStart;
            _CR_IN_ = newCr;
            _NFT_IN_SWITCH_ = true;
        }
    }

    function changeNFTRandomInPrice(uint256 newGsStart, uint256 newCr, bool switch) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        if (!switch) {
            _NFT_RANDOM_OUT_SWITCH_ = false;
        } else {
            require(newCr>DecimalMath.ONE, "CR_ZERO");
            _GS_START_RANDOM_OUT_ = newGsStart;
            _CR_RANDOM_OUT_ = newCr;
            _NFT_RANDOM_OUT_SWITCH_ = true;
        }
    }

    function changeNFTTargetOutPrice(uint256 newGsStart, uint256 newCr, bool switch) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        if (!switch) {
            _NFT_TARGET_OUT_SWITCH_ = false;
        } else {
            require(newCr>DecimalMath.ONE, "CR_ZERO");
            _GS_START_TARGET_OUT_ = newGsStart;
            _CR_TARGET_OUT_ = newCr;
            _NFT_TARGET_OUT_SWITCH_ = true;
        }
    }

    function changeNFTAmount(uint256 maxNFTAmount, uint256 minNFTAmount) external {
        require(msg.sender == IFilterAdmin(_OWNER_)._OWNER_(), "ACCESS_RESTRICTED");
        require(maxNFTAmount >= minNFTAmount, "AMOUNT_INVALID");
        _MAX_NFT_AMOUNT_ = maxNFTAmount;
        _MIN_NFT_AMOUNT_ = minNFTAmount;
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

    // ============ Support ============

    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId;
    }


    function version() virtual external pure returns (string memory) {
        return "FILTER_1_ERC721 1.0.0";
    //TODO:
    function geometricCalc1(uint256 base, uint256 ratio, uint256 times) internal view returns(uint256 newBase, uint256 sum) {
        require(times > 0);
        //q^(n-1)
        uint256 general_coefficient = ratio.powFloor(times - 1);
        //an=a1*q^n-1
        newBase = base.mul(general_coefficient);

        if(ratio == 1e18) {
            //na1
            sum = base.mul(times);
        } else {
            //a1(1-q^n)/(1-q)
            uint256 denominator = base.mul(1e18.sub(DecimalMath.mulFloor(general_coefficient, ratio)));
            sum = denominator.div(1e18.sub(ratio));
        }
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
}