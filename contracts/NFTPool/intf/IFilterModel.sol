/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

interface IFilterModel {
    function isFilterERC721Pass(address nftCollectionAddress, uint256 nftId) external view returns (bool);
    
    function isFilterERC1155Pass(address nftCollectionAddress, uint256 nftId, uint256 amount) external view returns (bool);

    function getAvaliableNFTIn() external view returns(uint256);

    function getAvaliableNFTOut() external view returns(uint256);

    function _NFT_IN_SWITCH_() external view returns(bool);

    function _NFT_RANDOM_SWITCH_() external view returns(bool);

    function _NFT_TARGET_SWITCH_() external view returns(bool);
    
    function getNFTInPrice(address nftCollectionAddress, uint256 nftId) external view returns (uint256);

    function getNFTRandomOutPrice() external view returns (uint256);

    function getNFTTargetOutPrice(address nftCollectionAddress, uint256 nftId) external view returns (uint256);

    function getRandomOutId() external view returns (address nftCollection, uint256 nftId);

    function transferOutERC721(address nftContract, address assetTo, uint256 nftId) external;

    function transferInERC721(address nftContract, address assetFrom, uint256 nftId) external;

    function transferOutERC1155(address nftContract, address assetTo, uint256 nftId, uint256 amount) external; 

    function transferBatchOutERC1155(address nftContract, address assetTo, uint256[] memory nftIds, uint256[] memory amounts) external; 

    function transferBatchInERC1155(address nftContract, address assetFrom, uint256[] memory nftIds, uint256[] memory amounts) external;
}