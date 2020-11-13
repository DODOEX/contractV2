/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IDVMVault {
    function init(
        address owner,
        address _baseToken,
        address _quoteToken
    ) external;

    function _BASE_TOKEN_() external returns (address);

    function _QUOTE_TOKEN_() external returns (address);

    function _BASE_RESERVE_() external returns (uint256);

    function _QUOTE_RESERVE_() external returns (uint256);

    function symbol() external returns (string memory);

    function decimals() external returns (uint256);

    function name() external returns (string memory);

    function totalSupply() external returns (uint256);

    function getVaultBalance() external view returns (uint256 baseBalance, uint256 quoteBalance);

    function getVaultReserve() external view returns (uint256 baseReserve, uint256 quoteReserve);

    function getBaseBalance() external view returns (uint256 baseBalance);

    function getQuoteBalance() external view returns (uint256 quoteBalance);

    function getBaseInput() external view returns (uint256 input);

    function getQuoteInput() external view returns (uint256 input);

    function sync() external;

    function transferBaseOut(address to, uint256 amount) external;

    function transferQuoteOut(address to, uint256 amount) external;

    function transfer(address to, uint256 amount) external returns (bool);

    function balanceOf(address owner) external view returns (uint256 balance);

    function shareRatioOf(address owner) external view returns (uint256 shareRatio);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function mint(address user, uint256 value) external;

    function burn(address user, uint256 value) external;
}
