/*

    Copyright 2022 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOV2} from "../intf/IDODOV2.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

contract DODOV2CuttingRouteHelper is InitializableOwnable {
    address public immutable _DVM_FACTORY_;
    address public immutable _DPP_FACTORY_;
    address public immutable _DSP_FACTORY_;

    // base -> quote -> address list
    mapping(address => mapping(address => address[])) public _FILTER_POOLS_;

    struct PairDetail {
        uint256 i;
        uint256 K;
        uint256 B;
        uint256 Q;
        uint256 B0;
        uint256 Q0;
        uint256 R;
        uint256 lpFeeRate;
        uint256 mtFeeRate;
        address baseToken;
        address quoteToken;
        address curPair;
        uint256 pairVersion;
    }

    constructor(address dvmFactory,address dppFactory,address dspFactory) public {
        _DVM_FACTORY_ = dvmFactory;
        _DPP_FACTORY_ = dppFactory;
        _DSP_FACTORY_ = dspFactory;
    }

    function getPairDetail(address token0,address token1,address userAddr) external view returns (PairDetail[] memory res) {
        address[] memory baseToken0DVM;
        address[] memory baseToken1DVM;
        address[] memory baseToken0DSP;
        address[] memory baseToken1DSP;

        if(_FILTER_POOLS_[token0][token1].length > 0) {
            baseToken0DVM = _FILTER_POOLS_[token0][token1];
        } 

        else if(_FILTER_POOLS_[token1][token0].length > 0) {
            baseToken1DVM = _FILTER_POOLS_[token1][token0];
        }
        
        else {
            (baseToken0DVM, baseToken1DVM) = IDODOV2(_DVM_FACTORY_).getDODOPoolBidirection(token0,token1);
            (baseToken0DSP, baseToken1DSP) = IDODOV2(_DSP_FACTORY_).getDODOPoolBidirection(token0,token1);
        }

        (address[] memory baseToken0DPP, address[] memory baseToken1DPP) = IDODOV2(_DPP_FACTORY_).getDODOPoolBidirection(token0,token1);


        uint256 len = baseToken0DVM.length + baseToken1DVM.length + baseToken0DPP.length + baseToken1DPP.length + baseToken0DSP.length + baseToken1DSP.length;
        res = new PairDetail[](len);
        for(uint8 i = 0; i < len; i++) {
            PairDetail memory curRes = PairDetail(0,0,0,0,0,0,0,0,0,address(0),address(0),address(0),2);
            address cur;
            if(i < baseToken0DVM.length) {
                cur = baseToken0DVM[i];
                curRes.baseToken = token0;
                curRes.quoteToken = token1;
            } else if(i < baseToken0DVM.length + baseToken1DVM.length) {
                cur = baseToken1DVM[i - baseToken0DVM.length];
                curRes.baseToken = token1;
                curRes.quoteToken = token0;
            } else if(i < baseToken0DVM.length + baseToken1DVM.length + baseToken0DPP.length) {
                cur = baseToken0DPP[i - baseToken0DVM.length - baseToken1DVM.length];
                curRes.baseToken = token0;
                curRes.quoteToken = token1;
            } else if(i < baseToken0DVM.length + baseToken1DVM.length + baseToken0DPP.length + baseToken1DPP.length)  {
                cur = baseToken1DPP[i - baseToken0DVM.length - baseToken1DVM.length - baseToken0DPP.length];
                curRes.baseToken = token1;
                curRes.quoteToken = token0;
            } else if(i < baseToken0DVM.length + baseToken1DVM.length + baseToken0DPP.length + baseToken1DPP.length + baseToken0DSP.length)  {
                cur = baseToken0DSP[i - baseToken0DVM.length - baseToken1DVM.length - baseToken0DPP.length - baseToken1DPP.length];
                curRes.baseToken = token0;
                curRes.quoteToken = token1;
            } else {
                cur = baseToken1DSP[i - baseToken0DVM.length - baseToken1DVM.length - baseToken0DPP.length - baseToken1DPP.length - baseToken0DSP.length];
                curRes.baseToken = token1;
                curRes.quoteToken = token0;
            }

            try IDODOV2(cur).getPMMStateForCall() returns (uint256 _i, uint256 _K, uint256 _B, uint256 _Q, uint256 _B0, uint256 _Q0, uint256 _R){                  
                curRes.i = _i;
                curRes.K = _K;
                curRes.B = _B;
                curRes.Q = _Q;
                curRes.B0 = _B0;
                curRes.Q0 = _Q0;
                curRes.R = _R;
            } catch {
                continue;
            }
            
            try IDODOV2(cur).getUserFeeRate(userAddr) returns  (uint256 lpFeeRate, uint256 mtFeeRate) {
                (curRes.lpFeeRate, curRes.mtFeeRate) = (lpFeeRate, mtFeeRate);
            } catch {
                (curRes.lpFeeRate, curRes.mtFeeRate) = (0, 1e18);
            }  
            curRes.curPair = cur;
            res[i] = curRes;
        }
    }


    function batchAddPoolByAdmin(
        address[] memory baseTokens, 
        address[] memory quoteTokens,
        address[] memory pools
    ) external onlyOwner {
        require(baseTokens.length == quoteTokens.length,"PARAMS_INVALID");
        require(baseTokens.length == pools.length,"PARAMS_INVALID");
        for(uint256 i = 0; i < baseTokens.length; i++) {
            address baseToken = baseTokens[i];
            address quoteToken = quoteTokens[i];
            address pool = pools[i];
            
            _FILTER_POOLS_[baseToken][quoteToken].push(pool);
        }
    }

    function removePoolByAdmin(
        address baseToken, 
        address quoteToken,
        address pool
    ) external onlyOwner {
        address[] memory pools = _FILTER_POOLS_[baseToken][quoteToken];
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i] == pool) {
                pools[i] = pools[pools.length - 1];
                break;
            }
        }
        _FILTER_POOLS_[baseToken][quoteToken] = pools;
        _FILTER_POOLS_[baseToken][quoteToken].pop();
    }
}