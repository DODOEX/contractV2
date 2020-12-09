/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../../lib/Ownable.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IMemSource} from "./MemSourceStake.sol";

contract MemPermission is Ownable {
    uint256 public _MEM_LEVEL_THRESHOLD_;
    address public _MEM_LEVEL_SOURCE_;

    constructor(address memLevelSource, uint256 memLevelThreshold) public {
        _MEM_LEVEL_THRESHOLD_ = memLevelThreshold;
        _MEM_LEVEL_SOURCE_ = memLevelSource;
    }

    function isAllowed(address account) external returns (bool) {
        return IMemSource(_MEM_LEVEL_SOURCE_).getMemLevel(account) >= _MEM_LEVEL_THRESHOLD_;
    }
}
