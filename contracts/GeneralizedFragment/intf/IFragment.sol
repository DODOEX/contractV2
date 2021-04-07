/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;


interface IFragment {

    function init(
      address dvm, 
      address vaultPreOwner,
      address collateralVault,
      uint256 totalSupply, 
      uint256 ownerRatio,
      uint256 buyoutTimestamp
    ) external;

    function buyout(address newVaultOwner) external;

    function redeem(address to) external;

    function _QUOTE_() external view returns (address);
}
