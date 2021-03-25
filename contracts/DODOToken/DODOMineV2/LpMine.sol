/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {BaseMine} from "./BaseMine.sol";

contract ERC20Mine is BaseMine {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // ============ Storage ============
    
    address public immutable _TOKEN_;

    constructor(address token) public {
        _TOKEN_ = token;
    }

    // ============ Event  ============
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);


    // ============ Deposit && Withdraw && Exit ============

    function deposit(uint256 amount) virtual public updateReward(msg.sender) {
        require(amount > 0, "DODOMineV2: CANNOT_DEPOSIT_ZERO");
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        IERC20(_TOKEN_).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) virtual public updateReward(msg.sender) {
        require(amount > 0, "DODOMineV2: CANNOT_WITHDRAW_ZERO");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        IERC20(_TOKEN_).safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    function withdrawAll() external {
        withdraw(balanceOf(msg.sender));
    }

    function exit() external {
        withdraw(balanceOf(msg.sender));
        getAllRewards();
    }
}
