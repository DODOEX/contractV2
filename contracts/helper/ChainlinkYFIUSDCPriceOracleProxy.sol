/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../lib/SafeMath.sol";


interface IChainlink {
    function latestAnswer() external view returns (uint256);
}


// for YFI-USDC(decimals=6) price convert

contract ChainlinkYFIUSDCPriceOracleProxy {
    using SafeMath for uint256;

    address public yfiEth = 0x7c5d4F8345e66f68099581Db340cd65B078C41f4;
    address public EthUsd = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;

    function getPrice() external view returns (uint256) {
        uint256 yfiEthPrice = IChainlink(yfiEth).latestAnswer();
        uint256 EthUsdPrice = IChainlink(EthUsd).latestAnswer();
        return yfiEthPrice.mul(EthUsdPrice).div(10**20);
    }
}
