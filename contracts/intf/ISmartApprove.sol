/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "./IERC20.sol";

interface ISmartApprove {
    function claimTokens(IERC20 token,address who,address dest,uint256 amount) external;
    function getSmartSwap() external view returns (address);
}