/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {IFeeRateModel} from "../../lib/FeeRateModel.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {PMMPricing} from "../../lib/PMMPricing.sol";

/**
 * @title Storage
 * @author DODO Breeder
 *
 * @notice Local Variables
 */
contract DPPStorage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Core Address ============

    address public _MAINTAINER_;

    IERC20 public _BASE_TOKEN_;
    IERC20 public _QUOTE_TOKEN_;

    uint128 public _BASE_RESERVE_;
    uint128 public _QUOTE_RESERVE_;

    uint120 public _BASE_TARGET_;
    uint120 public _QUOTE_TARGET_;
    uint16 public _RState_;

    // ============ Variables for Pricing ============

    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    
    uint64 public _LP_FEE_RATE_;
    uint64 public _K_;
    uint128 public _I_;
}
