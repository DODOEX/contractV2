/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "./InitializableOwnable.sol";

contract OperatorSystem is InitializableOwnable {
    mapping(address => bool) internal _global_operator_;
    mapping(address => mapping(address => bool)) internal _operator_; // user=>operator=>isValid

    function isValidOperator(address user, address operator) external view returns (bool) {
        return user == operator || _global_operator_[operator] || _operator_[user][operator];
    }

    function addGlobalOperator(address operator) external onlyOwner {
        _global_operator_[operator] = true;
    }

    function removeGlobalOperator(address operator) external onlyOwner {
        _global_operator_[operator] = false;
    }

    function addOperator(address operator) external {
        _operator_[msg.sender][operator] = true;
    }

    function removeOperator(address operator) external {
        _operator_[msg.sender][operator] = false;
    }
}
