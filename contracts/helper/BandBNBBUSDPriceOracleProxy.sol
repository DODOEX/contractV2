/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;


interface IBandOracleAggregator {
    function getReferenceData(string memory base, string memory quote)
        external
        view
        returns (uint256);
}


contract BandBNBBUSDPriceOracleProxy {
    IBandOracleAggregator public aggregator;

    constructor(IBandOracleAggregator _aggregator) public {
        aggregator = _aggregator;
    }

    function getPrice() public view returns (uint256) {
        return aggregator.getReferenceData("BNB", "USD");
    }
}
