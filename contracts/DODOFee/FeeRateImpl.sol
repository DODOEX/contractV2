/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {IERC20} from "../intf/IERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";

interface ICrowdPooling {
    function _QUOTE_RESERVE_() external view returns (uint256);
    function getShares(address user) external view returns (uint256);
}

interface IFee {
    function getUserFee(address user) external view returns (uint256);
}

interface IQuota {
    function getUserQuota(address user) external view returns (int);
}

contract FeeRateImpl is InitializableOwnable {
    using SafeMath for uint256;

    struct CPPoolInfo {
        address quoteToken;
        int globalQuota;
        address feeAddr;
        address quotaAddr;
    }

    mapping(address => CPPoolInfo) cpPools;

    function addCpPoolInfo(address cpPool, address quoteToken, int globalQuota, address feeAddr, address quotaAddr) external onlyOwner {
        CPPoolInfo memory cpPoolInfo =  CPPoolInfo({
            quoteToken: quoteToken,
            feeAddr: feeAddr,
            quotaAddr: quotaAddr,
            globalQuota: globalQuota
        });
        cpPools[cpPool] = cpPoolInfo;
    }

    function setCpPoolInfo(address cpPool, address quoteToken, int globalQuota, address feeAddr, address quotaAddr) external onlyOwner {
        cpPools[cpPool].quoteToken = quoteToken;
        cpPools[cpPool].feeAddr = feeAddr;
        cpPools[cpPool].quotaAddr = quotaAddr;
        cpPools[cpPool].globalQuota = globalQuota;
    }

    function getFeeRate(address pool, address user) external view returns (uint256) {
        CPPoolInfo memory cpPoolInfo = cpPools[pool];
        address quoteToken = cpPoolInfo.quoteToken;
        if(quoteToken == address(0)) {
            return 0;
        }else {
            uint256 userInput = IERC20(quoteToken).balanceOf(pool).sub(ICrowdPooling(pool)._QUOTE_RESERVE_());
            uint256 userStake = ICrowdPooling(pool).getShares(user);
            address feeAddr = cpPoolInfo.feeAddr;
            address quotaAddr = cpPoolInfo.quotaAddr;
            int curQuota = cpPoolInfo.globalQuota;
            if(quotaAddr != address(0))
                curQuota = IQuota(quotaAddr).getUserQuota(user);

            require(curQuota == -1 || (curQuota != -1 && int(userInput.add(userStake)) <= curQuota), "DODOFeeImpl: EXCEED_YOUR_QUOTA");

            if(feeAddr == address(0)) {
                return 0;
            } else {
                return IFee(feeAddr).getUserFee(user);
            }
        }
    }


    function getCPInfoByUser(address pool, address user) external view returns (bool isHaveCap, int curQuota, uint256 userFee) {
        CPPoolInfo memory cpPoolInfo = cpPools[pool];
        if(cpPoolInfo.quoteToken == address(0)) {
            isHaveCap = false;
            curQuota = -1;
            userFee = 0;
        }else {
            address quotaAddr = cpPoolInfo.quotaAddr;
            curQuota = cpPoolInfo.globalQuota;
            if(quotaAddr != address(0))
                curQuota = IQuota(quotaAddr).getUserQuota(user);
        
            if(curQuota == -1) {
                isHaveCap = false;
            }else {
                isHaveCap = true;
                uint256 userStake = ICrowdPooling(pool).getShares(user);
                curQuota = int(uint256(curQuota).sub(userStake));
            }

            address feeAddr = cpPoolInfo.feeAddr;
            if(feeAddr == address(0)) {
                userFee =  0;
            } else {
                userFee = IFee(feeAddr).getUserFee(user);
            }
        }

    }
}
