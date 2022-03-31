/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOAdapter} from "../intf/IDODOAdapter.sol";
import {IBalV2} from "../intf/IBalV2.sol";
import {IAsset} from "../intf/IAsset.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

// for two tokens; to adapter like dodo V1
contract BalancerV2Adapter is IDODOAdapter {
    using SafeMath for uint;
    using UniversalERC20 for IERC20;

    // migrate struct from balv2
    enum SwapKind { GIVEN_IN, GIVEN_OUT }

    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        IAsset assetIn;
        IAsset assetOut;
        uint256 amount;
        bytes userData;
    }

    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    //====================== swap =======================

    // As assets are saved by vault instead of pools, the follow pool = vault
    function _balV2Swap(address to, address pool, bytes memory moreInfo) internal {
        (bytes32 poolId, address fromToken, address toToken) = abi.decode(moreInfo, (bytes32, address, address));
        uint256 sellAmount = IERC20(fromToken).balanceOf(address(this));

        // construct SingleSwap
        IBalV2.SingleSwap memory singleSwap;
        singleSwap.poolId = poolId;
        singleSwap.kind = IBalV2.SwapKind.GIVEN_IN;
        singleSwap.assetIn = IAsset(fromToken);
        singleSwap.assetOut = IAsset(toToken);
        singleSwap.amount = sellAmount;
        singleSwap.userData = "0x";

        //construct fundmanagement
        IBalV2.FundManagement memory fundManagement;
        fundManagement.fromInternalBalance = false;
        fundManagement.toInternalBalance = false;
        fundManagement.sender = address(this);
        fundManagement.recipient = payable(to);

        // approve
        IERC20(fromToken).universalApproveMax(pool, sellAmount);
        // swap
        IBalV2(pool).swap(singleSwap, fundManagement, 0, 999999999999999999); //deadline: infinity
    }

    function sellBase(address to, address pool, bytes memory moreInfo) external override {
        _balV2Swap(to, pool, moreInfo);
    }

    function sellQuote(address to, address pool, bytes memory moreInfo) external override {
        _balV2Swap(to, pool, moreInfo);
    }
}