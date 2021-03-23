/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {SafeMath} from "../../lib/SafeMath.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IERC721} from "../../intf/IERC721.sol";
import {IERC721Receiver} from "../../intf/IERC721Receiver.sol";

contract NFTCollateralVault is InitializableOwnable, IERC721Receiver, ReentrancyGuard {
    mapping(address => uint256[]) public _COLLECTIONS_;
    address[] public _COLLECTION_ADDRESSES_;

    function transferOwnership(address newOwner) external override onlyOwner {
        emit OwnershipTransferred(_OWNER_, newOwner);
        _OWNER_ = newOwner;
    }
}
