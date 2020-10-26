/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {DVMStorage} from "./DVMStorage.sol";

contract DVMAdmin is DVMStorage{

  function setI(uint256 newI) external onlyOwner{}

  function setK(uint256 newK) external onlyOwner{}

}