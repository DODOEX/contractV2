/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IOracle} from "../../intf/IOracle.sol";

interface IWooracle {
    function timestamp() external view returns (uint256);
    function isFeasible(address base) external view returns (bool);
    function getPrice(address base) external view returns (uint256);
    function price(address base) external view returns (uint256 priceNow, bool feasible);
}

contract WooOracleAdapter is IOracle {
    IWooracle public oracle;

    constructor(address oracleAddress) public {
        oracle = IWooracle(oracleAddress);
    }

    function getPrice(address base) external override view returns (uint256 latestPrice,bool isValid,bool isStale,uint256 timestamp) {
        latestPrice = oracle.getPrice(base);
        isValid = oracle.isFeasible(base);
        isStale = !isValid;
        timestamp = oracle.timestamp();
        return (latestPrice, isValid, isStale, timestamp);
    }    

    function prices(address base) external override view returns (uint256) {
        require(oracle.isFeasible(base), "ORACLE NOT FEASIBLE");
        return oracle.getPrice(base);
    }
    
    function isFeasible(address base) external override view returns (bool) {
        return oracle.isFeasible(base);
    }
}