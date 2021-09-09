/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

interface IFilterAdmin {
    function _OWNER_() external returns (address);

    function _CONTROLLER_MODEL_() external returns (address);

    function init(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint256 fee,
        address mtFeeModel,
        address defaultMaintainer,
        address[] memory filters
    ) external;

    function ERC721In(
        address filter, 
        address nftContract, 
        uint256[] memory tokenIds,
        uint256 minMintAmount
    ) external;
}