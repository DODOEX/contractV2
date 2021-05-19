/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";

interface IFee {
    function getUserFee(address user,uint256 ticketAmount) external view returns (uint256);
}

interface IPrice {
    function getUserPrice(address user, uint256 originalPrice, uint256 ticketAmount) external view returns (uint256);
}

contract MysteryBoxFeeModel is InitializableOwnable {
    using SafeMath for uint256;

    struct MysteryBoxInfo {
        bool isSet;
        uint256 globalFee;
        address feeAddr;
        address priceAddr;
    }

    mapping(address => MysteryBoxInfo) mysteryBoxes;

    function addMysteryBoxInfo(address mysteryBox, uint256 globalFee, address feeAddr, address priceAddr) external onlyOwner {
        MysteryBoxInfo memory boxInfo =  MysteryBoxInfo({
            isSet: true,
            globalFee: globalFee,
            feeAddr: feeAddr,
            priceAddr: priceAddr
        });
        mysteryBoxes[mysteryBox] = boxInfo;
    }

    function setMysteryBoxInfo(address mysteryBox, uint256 globalFee, address feeAddr, address priceAddr) external onlyOwner {
        require(mysteryBoxes[mysteryBox].isSet, "NOT_FOUND_BOX");
        mysteryBoxes[mysteryBox].globalFee = globalFee;
        mysteryBoxes[mysteryBox].feeAddr = feeAddr;
        mysteryBoxes[mysteryBox].priceAddr = priceAddr;
    }

    function getPayAmount(address mysteryBox, address user, uint256 originalPrice, uint256 ticketAmount) external view returns (uint256 payAmount, uint256 feeAmount) {
        MysteryBoxInfo memory boxInfo = mysteryBoxes[mysteryBox];
        if(!mysteryBoxes[mysteryBox].isSet) {
            payAmount = originalPrice.mul(ticketAmount);
            feeAmount = 0;
        } else {
            uint256 feeRate = boxInfo.globalFee;
            address feeAddr = boxInfo.feeAddr;
            if(feeAddr != address(0))
                feeRate = IFee(feeAddr).getUserFee(user, ticketAmount);
            
            uint256 price = originalPrice;
            address priceAddr = boxInfo.priceAddr;
            if(priceAddr != address(0))
                price = IPrice(priceAddr).getUserPrice(user, originalPrice, ticketAmount);
            
            payAmount = price.mul(ticketAmount);
            feeAmount = DecimalMath.mulFloor(payAmount, feeRate);
        }
    }
}