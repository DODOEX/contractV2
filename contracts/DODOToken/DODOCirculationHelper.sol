/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../intf/IERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {Ownable} from "../lib/Ownable.sol";

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

    constructor(address dodoToken) public {
        _DODO_TOKEN_ = dodoToken;
    } // todo

    function addLockedContractAddress(address lockedContract) external onlyOwner {} // todo

    function removeLockedContractAddress(address lockedContract) external onlyOwner {} // todo

    function getCirculation() public view returns (uint256 circulation) {
        circulation = 10**9;
        //TODO  circulation 需要乘以decimals吗?
        for (uint256 i = 0; i < _LOCKED_CONTRACT_ADDRESS_.length; i++) {
            circulation -= IERC20(_DODO_TOKEN_).balanceOf(_LOCKED_CONTRACT_ADDRESS_[i]);
        }
    }

    function getVDODOWithdrawFeeRatio() external view returns (uint256 ratio) {
        uint256 dodoCirculationAmout = getCirculation();
        // (x - 1)^2 / 81 + (y - 15)^2 / 100 = 1
        // y = 5% (x ≤ 1)
        // y = 15% (x ≥ 10)
        // y = 15% - 10% * sqrt(1-[(x-1)/9]^2)
        uint256 x =
            DecimalMath.divCeil(
                dodoCirculationAmout,
                IERC20(_DODO_TOKEN_).balanceOf(address(this))// TODO 这里应该是vdodo的值吧？
            );

        if (x <= 10**18) {
            return _MIN_PENALTY_RATIO_;
        } else if (x >= 10**19) {
            return _MAX_PENALTY_RATIO_;
        } else {
            uint256 xTemp = x.sub(DecimalMath.ONE).div(9);
            uint256 premium = DecimalMath.ONE2.sub(xTemp.mul(xTemp)).sqrt();
            ratio =
                _MAX_PENALTY_RATIO_ -
                DecimalMath.mulFloor(_MAX_PENALTY_RATIO_ - _MIN_PENALTY_RATIO_, premium);
        }
    }
}
