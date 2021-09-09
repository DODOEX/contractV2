/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

interface IFilterAdmin {
    function _OWNER_() external returns (address);

    function _CONTROLLER_MODEL_() external returns (address);

    function init(
        address owner,
        uint256 initSupply,
        string memory name,
        string memory symbol,
        uint256 fee,
        address mtFeeModel,
        address defaultMaintainer,
        address[] memory filters
    ) external;

    function mintFragTo(address to, uint256 rawAmount) external returns (uint256 received);

    function burnFragFrom(address from, uint256 rawAmount) external returns (uint256 paid);

    function queryChargeMintFee(uint256 rawAmount) external view returns (uint256 poolFee, uint256 mtFee);

    function queryChargeBurnFee(uint256 rawAmount) external view returns (uint256 poolFee, uint256 mtFee);
}
