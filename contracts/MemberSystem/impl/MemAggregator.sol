/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../../lib/Ownable.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";

interface IMemSource {
    function getMemLevel(address user) external returns (uint256);
}

contract MemRegistry is Ownable {
    using SafeMath for uint256;

    address[] internal _VALID_MEM_SOURCE_LIST_;
    mapping(address => bool) internal _VALID_MEM_SOURCE_;
    mapping(address => uint256) internal _MEM_SOURCE_WEIGHT_;

    function getMemLevel(address user) public returns (uint256 memLevel) {
        for (uint8 i = 0; i < _VALID_MEM_SOURCE_LIST_.length; i++) {
            address _source = _VALID_MEM_SOURCE_LIST_[i];
            memLevel = memLevel.add(
                IMemSource(_source).getMemLevel(user).mul(_MEM_SOURCE_WEIGHT_[_source])
            );
        }
    }

    function setMemSourceWeight(address source, uint256 weight) external onlyOwner {
        _MEM_SOURCE_WEIGHT_[source] = weight;
    }

    function addMemSource(address source) external onlyOwner {
        require(!_VALID_MEM_SOURCE_[source], "SOURCE_ALREADY_EXIST");
        _VALID_MEM_SOURCE_LIST_.push(source);
        _VALID_MEM_SOURCE_[source] = true;
    }

    function removeMemSource(address source) external onlyOwner {
        require(_VALID_MEM_SOURCE_[source], "SOURCE_NOT_EXIST");
        for (uint8 i = 0; i <= _VALID_MEM_SOURCE_LIST_.length - 1; i++) {
            if (_VALID_MEM_SOURCE_LIST_[i] == source) {
                _VALID_MEM_SOURCE_LIST_[i] = _VALID_MEM_SOURCE_LIST_[_VALID_MEM_SOURCE_LIST_
                    .length - 1];
                _VALID_MEM_SOURCE_LIST_.pop();
                break;
            }
        }
        _VALID_MEM_SOURCE_[source] = false;
    }
}
