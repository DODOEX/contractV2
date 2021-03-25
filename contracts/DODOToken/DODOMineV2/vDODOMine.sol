/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {BaseMine} from "./BaseMine.sol";

interface IVDODOToken {
    function availableBalanceOf(address account) external view returns (uint256);
}

contract vDODOMine is BaseMine {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // ============ Storage ============
    address public immutable _vDODO_TOKEN_;

    constructor(address vDODOToken) public {
        _vDODO_TOKEN_ = vDODOToken;
    }

    // ============ Event =============

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    // ============ Deposit && Withdraw && Exit ============

    function deposit(uint256 amount) public {
        require(amount > 0, "vDODOMineETH: CANNOT_DEPOSIT_ZERO");
        require(IVDODOToken(_vDODO_TOKEN_).availableBalanceOf(msg.sender) >= amount, "vDODOMineETH: vDODO_NOT_ENOUGH");
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) public {
        require(amount > 0, "DODOMineV2: CANNOT_WITHDRAW_ZERO");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        emit Withdraw(msg.sender, amount);
    }

    function withdrawAll() external {
        withdraw(balanceOf(msg.sender));
    }

    function exit() external {
        withdraw(balanceOf(msg.sender));
        getAllRewards();
    }

    // ============ View  ============

    function getLockedvDODO(address account) external view returns (uint256) {
        return balanceOf(account);
    }


    // =============== Ownable  ================

    function syncBalance(address[] calldata accountList, uint256[] calldata amountList) external onlyOwner {
        require(accountList.length == amountList.length, "DODOMineV2: LENGTH_NOT_MATCH");
        for (uint256 i = 0; i < accountList.length; ++i) {
            uint256 curBalance = balanceOf(accountList[i]);
            if(curBalance > amountList[i]) {
                uint256 subAmount = curBalance.sub(amountList[i]);
                _totalSupply = _totalSupply.sub(subAmount);
                _balances[accountList[i]] = amountList[i];
            }
        }
    }

}