    /*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../intf/IERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {IDODOApproveProxy} from "../SmartRoute/DODOApproveProxy.sol";

interface IDODOCirculationHelper {
    // vDODO 锁仓不算流通
    function getCirculation() external returns (uint256);

    function getVDODOWithdrawFeeRatio() external returns (uint256);
}

contract DODOCirculationHelper is Ownable {
    using SafeMath for uint256;

    // ============ Storage ============

    address immutable _DODO_TOKEN_;
    address[] _LOCKED_CONTRACT_ADDRESS_;

            uint256 public _MIN_PENALTY_RATIO_ = 5 * 10**16; // 5%
    uint256 public _MAX_PENALTY_RATIO_ = 15 * 10**16; // 15%

 // ============= Helper and calculation function ===============
    function getVDODOWithdrawFeeRatio() internal returns (uint256) {
        uint256 dodoCirculationAmout =
            IDODOCirculationHelper(_DODO_CIRCULATION_HELPER_).getCirculation();
        // (x - 1)^2 / 81 + (y - 15)^2 / 100 = 1 ==> y = sqrt(100* (x*x +2x ) / 81)) +15
        // y = 5% (x ≤ 1)
        // y = 15% (x ≥ 10)
        uint256 x =
            DecimalMath.divCeil(
                dodoCirculationAmout,
                IERC20(_DODO_TOKEN_).balanceOf(address(this))
            );

        if (x <= 10**18) {
            return _MIN_PENALTY_RATIO_;
        } else if (x >= 10**19) {
            return _MAX_PENALTY_RATIO_;
        } else {
            uint256 xSubOne = x.sub(DecimalMath.ONE);
            xSubOne.sub(9)
            uint256 rewardAmount =
                uint256(81 * 10**18).sub(xSubOne.mul(xSubOne)).mul(100).div(81).sqrt().add(15);
            return rewardAmount;
        }
    }



}
    
   