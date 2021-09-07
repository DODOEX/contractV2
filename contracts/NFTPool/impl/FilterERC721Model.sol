/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterERC721Model} from "../intf/IFilterERC721Model.sol";

contract FilterERC721Model is InitializableOwnable, IFilterERC721Model {
    using SafeMath for uint256;

    //=================== Storage ===================
    // nftCollection -> nftId -> price(frag)
    mapping(address => mapping(uint256 => uint256)) public _PRICES_;
    // nftCollection -> nftId -> specPrice(frag)
    mapping(address => mapping(uint256 => uint256)) public _SPEC_PRICES_;
    uint256 public _SPEC_FACTOR_ = 200;
    // nftColletcion -> nftIds
    mapping(address => uint256[]) public _NFT_COLLECTION_IDS_;
    address[] public _NFT_COLLECTIONS_;
    
    uint256 public _LOTTERY_THRESHOLD_;
    uint256 public _TOTAL_NFT_AMOUNT_;
    uint256 public _CURRENT_NFT_AMOUNT_;

    
    uint256 public _TIMELOCK_DURATION_;

    struct LockFilterInfo {
        address[] nftCollections;
        uint256[] nftIds;
        uint256[] prices; 
        uint256[] specPrices;
        uint256 releaseTime;
    }
    mapping(bytes32 => LockFilterInfo) public _TIME_LOCKS_;
    
    uint256 public _PENDING_LOTTERY_THRESHOLD_;
    uint256 public _PENDING_TOTAL_NFT_AMOUNT_;
    uint256 public _PENDING_SPEC_FACTOR_;
    uint256 public _GLOBAL_TIME_LOCK_;


    function init(
        address owner,
        uint256 specFactor,
        uint256 lotteryThreshold,
        uint256 totalNftAmount,
        uint256 timeLockDuration
    ) external {
        initOwner(owner);
        _SPEC_FACTOR_ = specFactor;
        _LOTTERY_THRESHOLD_ = lotteryThreshold;
        _TOTAL_NFT_AMOUNT_ = totalNftAmount;
        _TIMELOCK_DURATION_ = timeLockDuration;
    }

    //==================== View ==================
    function isFilterERC721Pass(address nftCollectionAddress, uint256 nftId) override external view returns (bool) {
        return _isInclude(nftCollectionAddress, nftId);
    }

    function saveNFTPrice(address nftCollectionAddress, uint256 nftId) override external view returns(uint256) {
        return _PRICES_[nftCollectionAddress][nftId];
    }

    function buySpecNFTPrice(address nftCollectionAddress, uint256 nftId) override external view returns(uint256) {
        return _SPEC_PRICES_[nftCollectionAddress][nftId];
    }

    function buyLotteryNFTPrice() override external view returns(uint256) {
        return _LOTTERY_THRESHOLD_;
    }

    function lottery() override external view returns(address nftCollection, uint256 nftId) {
        //random
    }



    //TODO: nftInCap
    //TODO: nftOutCap


    //============= Owner ===============

    function addNFTFilter(
        address[] memory nftCollections, 
        uint256[] memory nftIds, 
        uint256[] memory prices, 
        uint256[] memory specPrices
    ) external onlyOwner {
        require(nftCollections.length == nftIds.length, "PARAMS_INVALID");
        require(nftCollections.length == prices.length, "PARAMS_INVALID");
        require(nftCollections.length == specPrices.length, "PARAMS_INVALID");

        for(uint256 i = 0; i < nftCollections.length; i++){
            if(_isInclude(nftCollections[i], nftIds[i])) continue;

            _PRICES_[nftCollections[i]][nftIds[i]] = prices[i];

            if(specPrices[i] == 0){
                _SPEC_PRICES_[nftCollections[i]][nftIds[i]] = prices[i].mul(_SPEC_FACTOR_).div(100);
            }else {
                _SPEC_PRICES_[nftCollections[i]][nftIds[i]] = specPrices[i];
            }

            if(_NFT_COLLECTION_IDS_[nftCollections[i]].length == 0) {
                _NFT_COLLECTIONS_.push(nftCollections[i]);
            } 

            _NFT_COLLECTION_IDS_[nftCollections[i]].push(nftIds[i]);
            require(++_CURRENT_NFT_AMOUNT_ <= _TOTAL_NFT_AMOUNT_, "OVERFLOW_NFT_AMOUNT");
        }
    }


    function scheduleUpdateNftFilter(
        address[] memory nftCollections, 
        uint256[] memory nftIds, 
        uint256[] memory prices, 
        uint256[] memory specPrices
    ) external onlyOwner {
        require(nftCollections.length == nftIds.length, "PARAMS_INVALID");
        require(nftCollections.length == prices.length, "PARAMS_INVALID");
        require(nftCollections.length == specPrices.length, "PARAMS_INVALID");
        
        uint256 releaseTime = block.timestamp.add(_TIMELOCK_DURATION_);
        bytes32 id = keccak256(abi.encode(nftCollections, nftIds, prices, specPrices, releaseTime));
        LockFilterInfo memory lockFilterInfo = LockFilterInfo({
            nftCollections: nftCollections,
            nftIds: nftIds,
            prices: prices,
            specPrices: specPrices,
            releaseTime: releaseTime
        });
        require(_TIME_LOCKS_[id].releaseTime == 0, "ALREADY_ADDED");
        for(uint256 i = 0; i< nftCollections.length; i++) {
            require(_isInclude(nftCollections[i],nftIds[i]));
        }
        _TIME_LOCKS_[id] = lockFilterInfo;
    }


    function executeUpdateNftFilter(
        bytes32 id
    ) external onlyOwner {
        LockFilterInfo memory lockFilterInfo = _TIME_LOCKS_[id];
        uint256 releaseTime = lockFilterInfo.releaseTime;
        require(releaseTime != 0 && releaseTime !=1 && block.timestamp > releaseTime, "TIMELOCKED");

        address[] memory nftCollections = lockFilterInfo.nftCollections;
        uint256[] memory nftIds = lockFilterInfo.nftIds;
        uint256[] memory prices = lockFilterInfo.prices;
        uint256[] memory specPrices = lockFilterInfo.specPrices;


        for(uint256 i = 0; i < nftCollections.length; i++){
            _PRICES_[nftCollections[i]][nftIds[i]] = prices[i];

            if(specPrices[i] == 0){
                _SPEC_PRICES_[nftCollections[i]][nftIds[i]] = prices[i].mul(_SPEC_FACTOR_).div(100);
            }else {
                _SPEC_PRICES_[nftCollections[i]][nftIds[i]] = specPrices[i];
            }
        }

        lockFilterInfo.releaseTime = 1;
        _TIME_LOCKS_[id] = lockFilterInfo;
    }


    //TODO:价格修改为0，是否是同样的效果
    function scheduleRemoveNFTFilter(
        address[] memory nftCollections, 
        uint256[] memory nftIds
    ) external onlyOwner {
        require(nftCollections.length == nftIds.length, "PARAMS_INVALID");
    }

    function executeRemoveNFTFilter(
        bytes32 id
    ) external onlyOwner {

    }


    function scheduleUpdateGlobalState(
        uint256 newLotteryThreshold,
        uint256 newSpecFactor,
        uint256 newTotalNFTAmount
    ) external onlyOwner {
        require(newTotalNFTAmount >= _CURRENT_NFT_AMOUNT_, "NFT_ALREADY_EXCEED");
        require(newSpecFactor > 100, "SPEC_FACTOR_TOO_LOW");

        _PENDING_LOTTERY_THRESHOLD_ = newLotteryThreshold;
        _PENDING_TOTAL_NFT_AMOUNT_ = newSpecFactor;
        _PENDING_SPEC_FACTOR_ = newTotalNFTAmount;

        _GLOBAL_TIME_LOCK_ = block.timestamp.add(_TIMELOCK_DURATION_);
    }

    function executeUpdateGlobalState() external onlyOwner {
        require(block.timestamp > _GLOBAL_TIME_LOCK_ && _GLOBAL_TIME_LOCK_ !=0, "TIMELOCKED");

        require(_PENDING_TOTAL_NFT_AMOUNT_ >= _CURRENT_NFT_AMOUNT_, "NFT_ALREADY_EXCEED");
        require(_PENDING_SPEC_FACTOR_ > 100, "SPEC_FACTOR_TOO_LOW");

        _LOTTERY_THRESHOLD_ = _PENDING_LOTTERY_THRESHOLD_;
        _SPEC_FACTOR_ = _PENDING_SPEC_FACTOR_;
        _TOTAL_NFT_AMOUNT_ = _PENDING_TOTAL_NFT_AMOUNT_;

        lockGlobalState();
    }

    function lockGlobalState() public onlyOwner {
        _PENDING_LOTTERY_THRESHOLD_ = 0;
        _PENDING_TOTAL_NFT_AMOUNT_ = 0;
        _PENDING_SPEC_FACTOR_ = 0;
        _GLOBAL_TIME_LOCK_ = 0;
    }


    //==================== internal ===================
    function _isInclude(address nftCollection, uint256 nftId) internal view returns (bool) {
        uint256[] memory ids = _NFT_COLLECTION_IDS_[nftCollection];
        uint256 i = 0;
        for(;i < ids.length; i++) {
            if(nftId == i) break;
        }
        if(i == ids.length) 
            return false;
        else 
            return true;
    }
}
