/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../intf/IERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {Ownable} from "../lib/Ownable.sol";

contract DODOMigrationBSC is Ownable {
    using SafeMath for uint256;

    // ============ Storage ============

    address immutable _ETH_DODO_TOKEN_ = 0x43Dfc4159D86F3A37A5A4B3D4580b888ad7d4DDd;
    address immutable _BSC_DODO_TOKEN_ = 0xa6E37b1d3690C8E608Bb11AFE193fA7C88141643;
    mapping(address => uint256) internal balances;

    bool public _IS_ETH_NETWORK_;

    constructor(bool isETHNetwork) public {
        _IS_ETH_NETWORK_ = isETHNetwork;
    }

    // ============ Events ============

    event Lock(address indexed sender, address indexed mintTo, uint256 amount);
    event Unlock(address indexed to, uint256 amount);

    // ============ Functions ============

    function lock(uint256 amount, address mintTo) external {
        address dodoToken = _IS_ETH_NETWORK_ ? _ETH_DODO_TOKEN_ : _BSC_DODO_TOKEN_;
        IERC20(dodoToken).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] = balances[msg.sender].add(amount);
        emit Lock(msg.sender, mintTo, amount);
    }

    function unlock(address unlockTo, uint256 amount) external onlyOwner {
        address dodoToken = _IS_ETH_NETWORK_ ? _ETH_DODO_TOKEN_ : _BSC_DODO_TOKEN_;
        require(balances[unlockTo] >= amount);
        balances[unlockTo] = balances[unlockTo].sub(amount);
        IERC20(dodoToken).transfer(unlockTo, amount);
        emit Unlock(unlockTo, amount);
    }
}
