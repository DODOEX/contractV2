/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";

contract NFTPoolFeeModel is InitializableOwnable {
    using SafeMath for uint256;

    uint256 public _GLOBAL_NFT_IN_FEE_ = 0;
    uint256 public _GLOBAL_NFT_RANDOM_OUT_FEE_ = 0;
    uint256 public _GLOBAL_NFT_TARGET_OUT_FEE_ = 50000000000000000;//0.05

    struct FilterAdminInfo {
        uint256 nftInFee;
        uint256 nftRandomOutFee;
        uint256 nftTargetOutFee;
        bool isSet;
    }

    mapping(address => FilterAdminInfo) filterAdmins;

    function addFilterAdminInfo(address filterAdminAddr, uint256 nftInFee, uint256 nftRandomOutFee, uint256 nftTargetOutFee) external onlyOwner {
        FilterAdminInfo memory filterAdmin =  FilterAdminInfo({
            nftInFee: nftInFee,
            nftRandomOutFee: nftRandomOutFee,
            nftTargetOutFee: nftTargetOutFee,
            isSet: true
        });
        filterAdmins[filterAdminAddr] = filterAdmin;
    }

    function setFilterAdminInfo(address filterAdminAddr, uint256 nftInFee, uint256 nftRandomOutFee, uint256 nftTargetOutFee) external onlyOwner {
        filterAdmins[filterAdminAddr].nftInFee = nftInFee;
        filterAdmins[filterAdminAddr].nftRandomOutFee = nftRandomOutFee;
        filterAdmins[filterAdminAddr].nftTargetOutFee = nftTargetOutFee;
    }

    function setGlobalParam(uint256 nftInFee, uint256 nftRandomOutFee, uint256 nftTargetOutFee) external onlyOwner {
        _GLOBAL_NFT_IN_FEE_ = nftInFee;
        _GLOBAL_NFT_RANDOM_OUT_FEE_ = nftRandomOutFee;
        _GLOBAL_NFT_TARGET_OUT_FEE_ = nftTargetOutFee;
    }

    
    function getNFTInFee(address filterAdminAddr, address) external view returns(uint256) {
        FilterAdminInfo memory filterAdminInfo = filterAdmins[filterAdminAddr];

        if(filterAdminInfo.isSet) {
            return filterAdminInfo.nftInFee;
        }else {
            return _GLOBAL_NFT_IN_FEE_;
        }
    }


    function getNFTRandomOutFee(address filterAdminAddr, address) external view returns(uint256) {
        FilterAdminInfo memory filterAdminInfo = filterAdmins[filterAdminAddr];

        if(filterAdminInfo.isSet) {
            return filterAdminInfo.nftRandomOutFee;
        }else {
            return _GLOBAL_NFT_RANDOM_OUT_FEE_;
        }
    }

    function getNFTTargetOutFee(address filterAdminAddr, address) external view returns(uint256) {
        FilterAdminInfo memory filterAdminInfo = filterAdmins[filterAdminAddr];

        if(filterAdminInfo.isSet) {
            return filterAdminInfo.nftTargetOutFee;
        }else {
            return _GLOBAL_NFT_TARGET_OUT_FEE_;
        }
    }    
    
}
