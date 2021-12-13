/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import "../intf/ICurve.sol";

contract CurveSampler {
   
    function sampleFromCurve(
        address curveAddress,
        int128 fromTokenIdx,
        int128 toTokenIdx,
        uint256[] memory takerTokenAmounts,
        bool noLending
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            uint256 buyAmount;
            if(noLending) {
                buyAmount = ICurve(curveAddress).get_dy(fromTokenIdx, toTokenIdx, takerTokenAmounts[i]);
            } else {
                buyAmount = ICurve(curveAddress).get_dy_underlying(fromTokenIdx, toTokenIdx, takerTokenAmounts[i]);
            }
              
            makerTokenAmounts[i] = buyAmount;
            // Break early if there are 0 amounts
            if (makerTokenAmounts[i] == 0) {
                break;
            }
        }
        return makerTokenAmounts;
    }
}
