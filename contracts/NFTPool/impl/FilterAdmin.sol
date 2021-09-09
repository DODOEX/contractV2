/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableInternalMintableERC20} from "../../external/ERC20/InitializableInternalMintableERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterModel} from "../intf/IFilterModel.sol";
import {IControllerModel} from "../intf/IControllerModel.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";

contract FilterAdmin is InitializableInternalMintableERC20, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Storage ============
    address[] public _FILTER_REGISTRY_;
    uint256 public _FEE_;
    address public _CONTROLLER_MODEL_;
    address public _DEFAULT_MAINTAINER_;

    function init(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint256 fee,
        address mtFeeModel,
        address defaultMaintainer,
        address[] memory filters
    ) external {
        super.init(_owner, 0, _name, _symbol, 18);
        _FILTER_REGISTRY_ = filters;
        _FEE_ = fee;
        _CONTROLLER_MODEL_ = mtFeeModel;
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
    }

    function ERC721In(
        address filter, 
        address nftContract, 
        uint256[] memory tokenIds,
        uint256 minMintAmount
    ) 
        external 
        preventReentrant
        returns (uint256 actualMintAmount)
    {
        require(isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        require(IFilterModel(filter)._NFT_IN_SWITCH_(), "NFT_IN_CLOSED");
        require(IFilterModel(filter).getAvaliableNFTIn() >= tokenIds.length, "EXCEED_MAX_AMOUNT");
        uint256 totalPrice = 0;
        for(uint256 i = 0; i < tokenIds.length; i++) {
            require(IFilterModel(filter).isFilterERC721Pass(nftContract, tokenIds[i]), "NOT_REGISTERED");
            totalPrice = totalPrice.add(IFilterModel(filter).getNFTInPrice(nftContract, tokenIds[i]));
            IFilterModel(filter).transferInERC721(nftContract, msg.sender, tokenIds[i]);
        }

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = _nftInFeeTransfer(totalPrice);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);
        
        actualMintAmount = totalPrice.sub(mtFeeAmount).sub(poolFeeAmount);
        require(actualMintAmount >= minMintAmount, "MINT_AMOUNT_NOT_ENOUGH");
        _mint(msg.sender, actualMintAmount);
    }

    function ERC1155In(
        address filter, 
        address nftContract, 
        uint256[] memory tokenIds, 
        uint256[] memory amounts,
        uint256 minMintAmount
    ) 
        external 
        preventReentrant
        returns (uint256 actualMintAmount)
    {
        require(tokenIds.length == amounts.length, "PARAMS_NOT_MATCH");
        require(isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        require(IFilterModel(filter)._NFT_IN_SWITCH_(), "NFT_IN_CLOSED");
        require(IFilterModel(filter).getAvaliableNFTIn() >= tokenIds.length, "EXCEED_MAX_AMOUNT");
        uint256 totalPrice = 0;
        for(uint256 i = 0; i < tokenIds.length; i++) {
            require(IFilterModel(filter).isFilterERC1155Pass(nftContract, tokenIds[i], amounts[i]), "NOT_REGISTERED");
            totalPrice = totalPrice.add(IFilterModel(filter).getNFTInPrice(nftContract, tokenIds[i]).mul(amounts[i]));
        }

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = _nftInFeeTransfer(totalPrice);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);

        actualMintAmount = totalPrice.sub(mtFeeAmount).sub(poolFeeAmount);
        require(actualMintAmount >= minMintAmount, "MINT_AMOUNT_NOT_ENOUGH");
        _mint(msg.sender, actualMintAmount);

        IFilterModel(filter).transferBatchInERC1155(nftContract, msg.sender, tokenIds, amounts);
    }

    function ERC721RandomOut(
        address filter,
        uint256 times,
        uint256 maxBurnAmount
    ) 
        external 
        preventReentrant
        returns (uint256 actualBurnAmount)
    {
        require(msg.sender == tx.origin, "ONLY_ALLOW_EOA");
        require(isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        require(IFilterModel(filter)._NFT_RANDOM_SWITCH_(), "NFT_RANDOM_CLOSED");
        require(IFilterModel(filter).getAvaliableNFTOut() >= times, "EXCEED_MAX_AMOUNT");
        uint256 totalPrice = 0;
        for(uint256 i = 0; i < times; i++) {
            totalPrice = totalPrice.add(IFilterModel(filter).getNFTRandomOutPrice());
            (address nftContract, uint256 tokenId) = IFilterModel(filter).getRandomOutId();
            IFilterModel(filter).transferOutERC721(nftContract, msg.sender, tokenId);
        }

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = _nftRandomOutFeeTransfer(totalPrice);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);
        actualBurnAmount = totalPrice;
        require(actualBurnAmount <= maxBurnAmount, "EXTRA_BURN_AMOUNT");
        _burn(msg.sender, actualBurnAmount);
    }


    function ERC1155RandomOut(
        address filter,
        uint256 times,
        uint256 maxBurnAmount
    ) 
        external 
        preventReentrant 
        returns (uint256 actualBurnAmount)
    {
        require(msg.sender == tx.origin, "ONLY_ALLOW_EOA");
        require(isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        require(IFilterModel(filter)._NFT_RANDOM_SWITCH_(), "NFT_RANDOM_OUT_CLOSED");
        require(IFilterModel(filter).getAvaliableNFTOut() >= times, "EXCEED_MAX_AMOUNT");

        uint256 totalPrice = 0;
        for(uint256 i = 0; i < times; i++) {
            totalPrice = totalPrice.add(IFilterModel(filter).getNFTRandomOutPrice());
            (address nftContract, uint256 tokenId) = IFilterModel(filter).getRandomOutId();
            IFilterModel(filter).transferOutERC1155(nftContract, msg.sender, tokenId, 1);
        }

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = _nftRandomOutFeeTransfer(totalPrice);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);
        
        actualBurnAmount = totalPrice;
        require(actualBurnAmount <= maxBurnAmount, "EXTRA_BURN_AMOUNT");
        _burn(msg.sender, actualBurnAmount);
    }

    function ERC721TargetOut(
        address filter, 
        address nftContract, 
        uint256[] memory tokenIds,
        uint256 maxBurnAmount
    ) 
        external 
        preventReentrant
        returns(uint256 actualBurnAmount)
    {
        require(isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        require(IFilterModel(filter)._NFT_TARGET_SWITCH_(), "NFT_TARGET_OUT_CLOSED");
        require(IFilterModel(filter).getAvaliableNFTOut() >= tokenIds.length, "EXCEED_MAX_AMOUNT");
        uint256 totalPrice = 0;
        for(uint256 i = 0; i < tokenIds.length; i++) {
            totalPrice = totalPrice.add(IFilterModel(filter).getNFTTargetOutPrice(nftContract, tokenIds[i]));
            IFilterModel(filter).transferOutERC721(nftContract, msg.sender, tokenIds[i]);
        }

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = _nftTargetOutFeeTransfer(totalPrice);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);
        
        actualBurnAmount = totalPrice;
        require(actualBurnAmount <= maxBurnAmount, "EXTRA_BURN_AMOUNT");
        _burn(msg.sender, actualBurnAmount);
    }

    function ERC1155TargetOut(
        address filter, 
        address nftContract,
        uint256[] memory tokenIds, 
        uint256[] memory amounts,
        uint256 maxBurnAmount
    ) 
        external 
        preventReentrant
        returns(uint256 actualBurnAmount)
    {
        require(tokenIds.length == amounts.length, "PARAMS_NOT_MATCH");
        require(isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        require(IFilterModel(filter)._NFT_TARGET_SWITCH_(), "NFT_TARGET_OUT_CLOSED");
        require(IFilterModel(filter).getAvaliableNFTOut() >= tokenIds.length, "EXCEED_MAX_AMOUNT");
        uint256 totalPrice = 0;
        for(uint256 i = 0; i < tokenIds.length; i++) {
            totalPrice = totalPrice.add(IFilterModel(filter).getNFTTargetOutPrice(nftContract, tokenIds[i]).mul(amounts[i]));
        }
        (uint256 poolFeeAmount, uint256 mtFeeAmount) = _nftTargetOutFeeTransfer(totalPrice);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);
        
        actualBurnAmount = totalPrice;
        require(actualBurnAmount <= maxBurnAmount, "EXTRA_BURN_AMOUNT");
        _burn(msg.sender, actualBurnAmount);

        IFilterModel(filter).transferBatchOutERC1155(nftContract, msg.sender, tokenIds, amounts);
    }


    //================ View ================
    function isIncludeFilter(address filter) view public returns (bool) {
        uint256 i = 0;
        for(; i < _FILTER_REGISTRY_.length; i++) {
            if(filter == _FILTER_REGISTRY_[i]) break;
        }
        return i == _FILTER_REGISTRY_.length ? false : true;
    }

    function getFilters() view public returns (address[] memory) {
        return _FILTER_REGISTRY_;
    }

    function version() virtual external pure returns (string memory) {
        return "FADMIN 1.0.0";
    }

    //=============== Owner ==============
    function addFilter(address filter) external onlyOwner {
        require(!isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        _FILTER_REGISTRY_.push(filter);
    }
    
    //=============== Internal ==============
    function _nftInFeeTransfer(uint256 totalPrice) internal returns (uint256 poolFeeAmount, uint256 mtFeeAmount) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getNFTInFee(address(this), msg.sender);
        poolFeeAmount = DecimalMath.mulFloor(totalPrice, _FEE_);
        mtFeeAmount = DecimalMath.mulFloor(totalPrice, mtFeeRate);
    }

    function _nftRandomOutFeeTransfer(uint256 totalPrice) internal returns (uint256 poolFeeAmount, uint256 mtFeeAmount) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getNFTRandomOutFee(address(this), msg.sender);
        poolFeeAmount = DecimalMath.mulFloor(totalPrice, _FEE_);
        mtFeeAmount = DecimalMath.mulFloor(totalPrice, mtFeeRate);
    }

    function _nftTargetOutFeeTransfer(uint256 totalPrice) internal returns (uint256 poolFeeAmount, uint256 mtFeeAmount) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getNFTTargetOutFee(address(this), msg.sender);
        poolFeeAmount = DecimalMath.mulFloor(totalPrice, _FEE_);
        mtFeeAmount = DecimalMath.mulFloor(totalPrice, mtFeeRate);
    }
}
