/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DODOMath} from "../../lib/DODOMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IFeeRateModel} from "../../lib/FeeRateModel.sol";
import {IERC20} from "../../intf/IERC20.sol";

contract DVMStorage is ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Core Address ============

    address public _MAINTAINER_;

    IERC20 public _BASE_TOKEN_;
    IERC20 public _QUOTE_TOKEN_;

    uint128 public _BASE_RESERVE_;
    uint128 public _QUOTE_RESERVE_;

    // ============ Shares (ERC20) ============

    string public symbol;
    uint8 public decimals;
    string public name;

    uint256 public totalSupply;
    mapping(address => uint256) internal _SHARES_;
    mapping(address => mapping(address => uint256)) internal _ALLOWED_;

    // ================= Permit ======================

    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    // ============ Variables for Pricing ============

    uint256 public _LP_FEE_RATE_;
    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    uint256 public _K_;
    uint256 public _I_;
}
