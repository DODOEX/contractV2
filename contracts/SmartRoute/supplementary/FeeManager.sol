/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IFeeManager} from "../intf/IFeeManager.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IWETH} from "../../intf/IWETH.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";


contract FeeManager is InitializableOwnable, IFeeManager {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    mapping(address => uint8) userRebateDivations;
    uint8 public immutable _FEE_DENOMINATOR_ = 100;
    address public immutable _WETH_;
    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint8 public _DEFAULT_DIVATION_ = 50;
    address public _DODO_RECEIVER_;

    constructor(
        address dodoReceiver,
        address payable weth
    ) public {
        _DODO_RECEIVER_ = dodoReceiver;
        _WETH_ = weth;
    }

    function setUserDivaiton(address user, uint8 divation) external onlyOwner {
        userRebateDivations[user] = divation;
    }

    function setNewDefaultDivation(uint8 defaultDeviation) external onlyOwner {
        _DEFAULT_DIVATION_ = defaultDeviation;
    }

    function setNewDODOReceiver(address dodoReceiver) external onlyOwner {
        _DODO_RECEIVER_ = dodoReceiver;
    }

    function rebate(address rebateTo, uint256 amount, address fromToken) external override{
        if(fromToken == _ETH_ADDRESS_) {
            fromToken = _WETH_;
        }
        require(IERC20(fromToken).universalBalanceOf(address(this)) >= amount, "DODO_FEEMANAGER: REBATE_AMOUNT_NOT_ENOUGH");

        uint8 userDiv = userRebateDivations[rebateTo];
        if(userDiv == 0) userDiv =  _DEFAULT_DIVATION_;
        uint256 rebateAmount = amount.mul(userDiv).div(_FEE_DENOMINATOR_);

        SafeERC20.safeTransfer(IERC20(fromToken), rebateTo, rebateAmount);
        SafeERC20.safeTransfer(IERC20(fromToken), _DODO_RECEIVER_, amount - rebateAmount);
    }

}