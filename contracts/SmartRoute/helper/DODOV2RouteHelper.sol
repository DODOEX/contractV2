/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOV2} from "../intf/IDODOV2.sol";

contract DODOV2RouteHelper {
    address public immutable _DVM_FACTORY_;
    address public immutable _DPP_FACTORY_;
    //TODO:UnownedDVMFactory 去掉可行性 

    struct PairDetail {
        uint256 i;
        uint256 K;
        uint256 B;
        uint256 Q;
        uint256 B0;
        uint256 Q0;
        uint8 R;
        uint256 totalFeeRate;
    }

    constructor(address dvmFactory,address dppFactory) public {
        _DVM_FACTORY_ = dvmFactory;
        _DPP_FACTORY_ = dppFactory;
    }

    function getPairDetail(address token0,address token1,address userAddr) external view returns (PairDetail[] memory res) {
        (address[] memory baseToken0DVM, address[] memory baseToken1DVM) = IDODOV2(_DVM_FACTORY_).getVendingMachineBidirection(token0,token1);
        (address[] memory baseToken0DPP, address[] memory baseToken1DPP) = IDODOV2(_DPP_FACTORY_).getPrivatePoolBidirection(token0,token1);
        uint256 len = baseToken0DVM.length + baseToken1DVM.length + baseToken0DPP.length + baseToken1DPP.length;
        res = new PairDetail[](len);
        for(uint8 i = 0; i < len; i++) {
            PairDetail memory curRes = PairDetail(0,0,0,0,0,0,0,0);
            address cur;
            if(i < baseToken0DVM.length) {
                cur = baseToken0DVM[i];
            } else if(i < baseToken0DVM.length + baseToken1DVM.length) {
                cur = baseToken1DVM[i - baseToken0DVM.length];
            } else if(i < baseToken0DVM.length + baseToken1DVM.length + baseToken0DPP.length) {
                cur = baseToken0DPP[i - baseToken0DVM.length - baseToken1DVM.length];
            } else {
                cur = baseToken1DPP[i - baseToken0DVM.length - baseToken1DVM.length - baseToken0DPP.length];
            }
            
            (            
                curRes.i,
                curRes.K,
                curRes.B,
                curRes.Q,
                curRes.B0,
                curRes.Q0,
                curRes.R
            ) = IDODOV2(cur).getPMMStateForCall();

            (uint256 lpFeeRate, uint256 mtFeeRate) = IDODOV2(cur).getUserFeeRate(userAddr);
            curRes.totalFeeRate = lpFeeRate + mtFeeRate;
            res[i] = curRes;
        }
    }
}