/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";

//todo
contract Governance is InitializableOwnable {

    function getLockedvDODO(address account) external pure returns (uint256 lockedvDODO) {
        lockedvDODO = 0;//todo for test
    }
}
