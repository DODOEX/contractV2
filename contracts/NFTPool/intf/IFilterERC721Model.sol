/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

interface IFilterERC721Model {
    function isFilterERC721Pass(address nftCollectionAddress, uint256 nftId) external view returns (bool);

    function saveNFTPrice(address nftCollectionAddress, uint256 nftId) external view returns(uint256);

    function buySpecNFTPrice(address nftCollectionAddress, uint256 nftId) external view returns(uint256);

    function buyLotteryNFTPrice() external view returns(uint256);

    function lottery() external view returns(address nftCollection, uint256 nftId);
}