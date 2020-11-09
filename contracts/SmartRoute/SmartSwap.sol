/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {Ownable} from "../lib/Ownable.sol";
import {ExternalCall} from "../lib/ExternalCall.sol";
import {IERC20} from "../intf/IERC20.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {ISmartApprove} from "../intf/ISmartApprove.sol";


contract SmartSwap is Ownable {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;
    using ExternalCall for address;

    ISmartApprove public smartApprove;

    IERC20 constant ETH_ADDRESS = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    event Swapped(
        IERC20 indexed fromToken,
        IERC20 indexed toToken,
        address indexed sender,
        uint256 fromAmount,
        uint256 toAmount
    );

    event ExternalRecord(address indexed to, address indexed sender);

    constructor(address _smartApprove) public {
        smartApprove = ISmartApprove(_smartApprove);
    }


    function dodoSwap(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory callPairs,
        bytes memory callDataConcat,
        uint256[] memory starts,
        uint256[] memory gasLimitsAndValues
    ) public payable returns (uint256 returnAmount) {
        require(minReturnAmount > 0, "haha hihi Min return should be bigger then 0.");
        require(callPairs.length > 0, "pairs should exists.");

        // if (fromToken != ETH_ADDRESS) {
        //     // smartApprove.claimTokens(fromToken, msg.sender, address(this), fromTokenAmount);
        // }

        // for (uint256 i = 0; i < callPairs.length; i++) {
        //     require(callPairs[i] != address(smartApprove), "Access denied");
        //     require(
        //         callPairs[i].externalCall(
        //             gasLimitsAndValues[i] & ((1 << 128) - 1),
        //             callDataConcat,
        //             starts[i],
        //             starts[i + 1] - starts[i],
        //             gasLimitsAndValues[i] >> 128
        //         )
        //     );
        // }

        // // Return back all unswapped
        // fromToken.universalTransfer(msg.sender, fromToken.universalBalanceOf(address(this)));

        // returnAmount = toToken.universalBalanceOf(address(this));

        // require(returnAmount >= minReturnAmount, "Return amount is not enough");
        // toToken.universalTransfer(msg.sender, returnAmount);
        emit Swapped(fromToken, toToken, msg.sender, fromTokenAmount, fromTokenAmount);
        // emit Swapped(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);
    }

    function externalSwap(
        IERC20 fromToken,
        IERC20 toToken,
        address approveTarget,
        address to,
        uint256 gasSwap,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat
    ) public payable returns (uint256 returnAmount) {
        
        require(minReturnAmount > 0, "Min return should be bigger then 0.");

        if (fromToken != ETH_ADDRESS) {
            smartApprove.claimTokens(fromToken, msg.sender, address(this), fromTokenAmount);
            fromToken.approve(approveTarget, fromTokenAmount);
        }

        (bool success, ) = to.call{value: msg.value, gas: gasSwap}(callDataConcat);

        require(success, "Contract Swap execution Failed");

        // Return back all unswapped
        fromToken.universalTransfer(msg.sender, fromToken.universalBalanceOf(address(this)));

        returnAmount = toToken.universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, "Return amount is not enough");
        toToken.universalTransfer(msg.sender, returnAmount);

        emit Swapped(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount);

        emit ExternalRecord(to, msg.sender);
    }
}
