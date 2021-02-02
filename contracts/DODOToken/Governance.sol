/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";

contract Governance is InitializableOwnable {

    // ============ Storage ============

    address immutable _DODO_TOKEN_;

    constructor(dodoToken) public {
        _DODO_TOKEN_ = dodoToken
    }
    
    function getLockedvDODO(address account) external pure returns (uint256 lockedvDODO) {
        lockedvDODO = 0;//DOTO,0 for test
    }
}
