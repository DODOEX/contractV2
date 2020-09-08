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
    address public chainlink = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;

    function getPrice() external view returns (uint256) {
        return IChainlink(chainlink).latestAnswer() / 100;
    }
}
