/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../../lib/Ownable.sol";
import {IMemSource} from "./MemAggregator.sol";
import {IERC20} from "../../intf/IERC20.sol";

contract MemSourceHold is Ownable, IMemSource {
    address public _DODO_TOKEN_;

    constructor(address dodoToken) public {
        _DODO_TOKEN_ = dodoToken;
    }

    // ============ View Function ============

    function getMemLevel(address user) external override returns (uint256) {
        return IERC20(_DODO_TOKEN_).balanceOf(user);
    }
}
