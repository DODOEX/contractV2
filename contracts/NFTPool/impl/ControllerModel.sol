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
    uint256 public _GLOBAL_NFT_OUT_FEE_ = 0;

    struct FilterAdminFeeInfo {
        uint256 nftInFee;
        uint256 nftOutFee;
        bool isSet;
    }

    mapping(address => FilterAdminFeeInfo) filterAdminFees;
    
    mapping(address => bool) isEmergencyWithdraw;

    //==================== Event =====================
    event SetEmergencyWithdraw(address filter, bool isOpen);

    //==================== Ownable ====================

    function addFilterAdminFeeInfo(address filterAdminAddr, uint256 nftInFee, uint256 nftOutFee) external onlyOwner {
        FilterAdminFeeInfo memory filterAdmin =  FilterAdminFeeInfo({
            nftInFee: nftInFee,
            nftOutFee: nftOutFee,
            isSet: true
        });
        filterAdminFees[filterAdminAddr] = filterAdmin;
    }

    function setFilterAdminFeeInfo(address filterAdminAddr, uint256 nftInFee, uint256 nftOutFee) external onlyOwner {
        filterAdminFees[filterAdminAddr].nftInFee = nftInFee;
        filterAdminFees[filterAdminAddr].nftOutFee = nftOutFee;
    }

    function setGlobalParam(uint256 nftInFee, uint256 nftOutFee) external onlyOwner {
        _GLOBAL_NFT_IN_FEE_ = nftInFee;
        _GLOBAL_NFT_OUT_FEE_ = nftOutFee;
    }

    function setEmergencyWithdraw(address filter, bool isOpen) external onlyOwner {
        isEmergencyWithdraw[filter] = isOpen;
        emit SetEmergencyWithdraw(filter, isOpen);
    }
 
    //===================== View ========================
    function getMintFee(address filterAdminAddr) external view returns(uint256) {
        FilterAdminFeeInfo memory filterAdminFeeInfo = filterAdminFees[filterAdminAddr];

        if(filterAdminFeeInfo.isSet) {
            return filterAdminFeeInfo.nftInFee;
        }else {
            return _GLOBAL_NFT_IN_FEE_;
        }
    }

    function getBurnFee(address filterAdminAddr) external view returns(uint256) {
        FilterAdminFeeInfo memory filterAdminFeeInfo = filterAdminFees[filterAdminAddr];

        if(filterAdminFeeInfo.isSet) {
            return filterAdminFeeInfo.nftOutFee;
        }else {
            return _GLOBAL_NFT_OUT_FEE_;
        }
    }

    function getEmergencySwitch(address filter) external view returns(bool) {
        return isEmergencyWithdraw[filter];
    }  
    
}
