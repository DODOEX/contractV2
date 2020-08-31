/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;


interface IMinimumOracle {
    function getPrice() external view returns (uint256);

    function setPrice(uint256 newPrice) external;

    function transferOwnership(address newOwner) external;
}


contract MinimumOracle {
    address public _OWNER_;
    uint256 public tokenPrice;

    // ============ Events ============

    event OwnershipTransfer(address indexed previousOwner, address indexed newOwner);

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == _OWNER_, "NOT_OWNER");
        _;
    }

    // ============ Functions ============

    constructor() public {
        _OWNER_ = msg.sender;
        emit OwnershipTransfer(address(0), _OWNER_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "INVALID_OWNER");
        emit OwnershipTransfer(_OWNER_, newOwner);
        _OWNER_ = newOwner;
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        tokenPrice = newPrice;
    }

    function getPrice() external view returns (uint256) {
        return tokenPrice;
    }
}
