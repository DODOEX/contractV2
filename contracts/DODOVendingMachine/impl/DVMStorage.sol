/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DODOMath} from "../../lib/DODOMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IExternalValue} from "../../lib/ExternalValue.sol";
import {IFeeRateModel} from "../../lib/FeeRateModel.sol";
import {IERC20} from "../../intf/IERC20.sol";

contract DVMStorage is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Advanced Controls ============

    bool public _BUYING_CLOSE_;
    bool public _SELLING_CLOSE_;

    IPermissionManager public _TRADE_PERMISSION_;
    IExternalValue public _GAS_PRICE_LIMIT_;

    // ============ Core Address ============

    address public _MAINTAINER_;

    IERC20 public _BASE_TOKEN_;
    IERC20 public _QUOTE_TOKEN_;

    uint256 public _BASE_RESERVE_;
    uint256 public _QUOTE_RESERVE_;

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
    bytes32
        public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    // ============ Variables for Pricing ============

    IFeeRateModel public _LP_FEE_RATE_MODEL_;
    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    uint256 public _K_;
    uint256 public _I_;

    // ============ Events ============

    event SetLpFeeRateModel(address indexed oldAddr, address indexed newAddr);

    event SetMtFeeRateModel(address indexed oldAddr, address indexed newAddr);

    event SetTradePermissionManager(address indexed oldAddr, address indexed newAddr);

    event SetMaintainer(address indexed oldAddr, address indexed newAddr);

    event SetGasPriceSource(address indexed oldAddr, address indexed newAddr);

    event SetBuy(bool allow);

    event SetSell(bool allow);

    // ============ Setting Functions ============

    function setLpFeeRateModel(address newLpFeeRateModel) external onlyOwner {
        emit SetLpFeeRateModel(address(_LP_FEE_RATE_MODEL_), newLpFeeRateModel);
        _LP_FEE_RATE_MODEL_ = IFeeRateModel(newLpFeeRateModel);
    }

    function setMtFeeRateModel(address newMtFeeRateModel) external onlyOwner {
        emit SetMtFeeRateModel(address(_MT_FEE_RATE_MODEL_), newMtFeeRateModel);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(newMtFeeRateModel);
    }

    function setTradePermissionManager(address newTradePermissionManager) external onlyOwner {
        emit SetTradePermissionManager(address(_TRADE_PERMISSION_), newTradePermissionManager);
        _TRADE_PERMISSION_ = IPermissionManager(newTradePermissionManager);
    }

    function setMaintainer(address newMaintainer) external onlyOwner {
        emit SetMaintainer(address(_MAINTAINER_), newMaintainer);
        _MAINTAINER_ = newMaintainer;
    }

    function setGasPriceSource(address newGasPriceLimitSource) external onlyOwner {
        emit SetGasPriceSource(address(_GAS_PRICE_LIMIT_), newGasPriceLimitSource);
        _GAS_PRICE_LIMIT_ = IExternalValue(newGasPriceLimitSource);
    }

    function setBuy(bool open) external onlyOwner {
        emit SetBuy(open);
        _BUYING_CLOSE_ = !open;
    }

    function setSell(bool open) external onlyOwner {
        emit SetSell(open);
        _SELLING_CLOSE_ = !open;
    }
}
