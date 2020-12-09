/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../../lib/Ownable.sol";
import {IMemSource} from "./MemAggregator.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";

contract MemSourceStake is Ownable, IMemSource {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public _DODO_TOKEN_;
    uint256 public _DODO_RESERVE_;
    uint256 public _COLD_DOWN_DURATION_;

    mapping(address => uint256) internal _STAKED_DODO_;
    mapping(address => uint256) internal _PENDING_DODO_;
    mapping(address => uint256) internal _EXECUTE_TIME_;

    constructor(address dodoToken) public {
        _DODO_TOKEN_ = dodoToken;
    }

    // ============ Owner Function ============

    function setColdDownDuration(uint256 coldDownDuration) external onlyOwner {
        _COLD_DOWN_DURATION_ = coldDownDuration;
    }

    // ============ DODO Function ============

    function admitStakedDODO(address to) external {
        uint256 dodoInput = IERC20(_DODO_TOKEN_).balanceOf(address(this)).sub(_DODO_RESERVE_);
        _STAKED_DODO_[to] = _STAKED_DODO_[to].add(dodoInput);
        _sync();
    }

    function stakeDODO(uint256 amount) external {
        _transferDODOIn(msg.sender, amount);
        _STAKED_DODO_[msg.sender] = _STAKED_DODO_[msg.sender].add(amount);
        _sync();
    }

    function requestDODOWithdraw(uint256 amount) external {
        _STAKED_DODO_[msg.sender] = _STAKED_DODO_[msg.sender].sub(amount);
        _PENDING_DODO_[msg.sender] = _PENDING_DODO_[msg.sender].add(amount);
        _EXECUTE_TIME_[msg.sender] = block.timestamp.add(_COLD_DOWN_DURATION_);
    }

    function withdrawDODO() external {
        require(_EXECUTE_TIME_[msg.sender] <= block.timestamp, "WITHDRAW_COLD_DOWN");
        _transferDODOOut(msg.sender, _PENDING_DODO_[msg.sender]);
        _PENDING_DODO_[msg.sender] = 0;
    }

    // ============ Balance Function ============

    function _transferDODOIn(address from, uint256 amount) internal {
        IERC20(_DODO_TOKEN_).transferFrom(from, address(this), amount);
    }

    function _transferDODOOut(address to, uint256 amount) internal {
        IERC20(_DODO_TOKEN_).transfer(to, amount);
    }

    function _sync() internal {
        _DODO_RESERVE_ = IERC20(_DODO_TOKEN_).balanceOf(address(this));
    }

    // ============ View Function ============

    function getMemLevel(address user) external override returns (uint256) {
        return _STAKED_DODO_[user];
    }
}
