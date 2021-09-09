/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";

contract ControllerModel is InitializableOwnable {
    using SafeMath for uint256;

    uint256 public _GLOBAL_NFT_IN_FEE_ = 0;
    uint256 public _GLOBAL_NFT_RANDOM_OUT_FEE_ = 0;
    uint256 public _GLOBAL_NFT_TARGET_OUT_FEE_ = 50000000000000000;//0.05

    struct FilterAdminFeeInfo {
        uint256 nftInFee;
        uint256 nftRandomOutFee;
        uint256 nftTargetOutFee;
        bool isSet;
    }

    mapping(address => FilterAdminFeeInfo) filterAdminFees;
    
    mapping(address => bool) isEmergencyWithdraw;

    //==================== Event =====================
    event SetEmergencyWithdraw(address filter, bool isOpen);

    //==================== Ownable ====================

    function addFilterAdminFeeInfo(address filterAdminAddr, uint256 nftInFee, uint256 nftRandomOutFee, uint256 nftTargetOutFee) external onlyOwner {
        FilterAdminFeeInfo memory filterAdmin =  FilterAdminFeeInfo({
            nftInFee: nftInFee,
            nftRandomOutFee: nftRandomOutFee,
            nftTargetOutFee: nftTargetOutFee,
            isSet: true
        });
        filterAdminFees[filterAdminAddr] = filterAdmin;
    }

    function setFilterAdminFeeInfo(address filterAdminAddr, uint256 nftInFee, uint256 nftRandomOutFee, uint256 nftTargetOutFee) external onlyOwner {
        filterAdminFees[filterAdminAddr].nftInFee = nftInFee;
        filterAdminFees[filterAdminAddr].nftRandomOutFee = nftRandomOutFee;
        filterAdminFees[filterAdminAddr].nftTargetOutFee = nftTargetOutFee;
    }

    function setGlobalParam(uint256 nftInFee, uint256 nftRandomOutFee, uint256 nftTargetOutFee) external onlyOwner {
        _GLOBAL_NFT_IN_FEE_ = nftInFee;
        _GLOBAL_NFT_RANDOM_OUT_FEE_ = nftRandomOutFee;
        _GLOBAL_NFT_TARGET_OUT_FEE_ = nftTargetOutFee;
    }

    function setEmergencyWithdraw(address filter, bool isOpen) external onlyOwner {
        isEmergencyWithdraw[filter] = isOpen;
        emit SetEmergencyWithdraw(filter, isOpen);
    }
 
    //===================== View ========================
    function getNFTInFee(address filterAdminAddr, address) external view returns(uint256) {
        FilterAdminFeeInfo memory filterAdminFeeInfo = filterAdminFees[filterAdminAddr];

        if(filterAdminFeeInfo.isSet) {
            return filterAdminFeeInfo.nftInFee;
        }else {
            return _GLOBAL_NFT_IN_FEE_;
        }
    }

    function getNFTRandomOutFee(address filterAdminAddr, address) external view returns(uint256) {
        FilterAdminFeeInfo memory filterAdminFeeInfo = filterAdminFees[filterAdminAddr];

        if(filterAdminFeeInfo.isSet) {
            return filterAdminFeeInfo.nftRandomOutFee;
        }else {
            return _GLOBAL_NFT_RANDOM_OUT_FEE_;
        }
    }

    function getNFTTargetOutFee(address filterAdminAddr, address) external view returns(uint256) {
        FilterAdminFeeInfo memory filterAdminFeeInfo = filterAdminFees[filterAdminAddr];

        if(filterAdminFeeInfo.isSet) {
            return filterAdminFeeInfo.nftTargetOutFee;
        }else {
            return _GLOBAL_NFT_TARGET_OUT_FEE_;
        }
    }  

    function getEmergencySwitch(address filter) external view returns(bool) {
        return isEmergencyWithdraw[filter];
    }  
    
}
