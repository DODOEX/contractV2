/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IChainlink {
    function latestAnswer() external view returns (uint256);
}

// for WETH-USDC(decimals=6) price convert

contract ChainlinkETHPriceOracleProxy {
    address public chainlink = 0xF79D6aFBb6dA890132F9D7c355e3015f15F3406F;

    function getPrice() external view returns (uint256) {
        return IChainlink(chainlink).latestAnswer() / 100;
    }
}
