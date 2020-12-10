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
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IExternalValue} from "../../lib/ExternalValue.sol";
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
    uint256 public _BASE_TARGET_;
    uint256 public _QUOTE_TARGET_;
    PMMPricing.RState public _RState_;

    // ============ Variables for Pricing ============

    IFeeRateModel public _LP_FEE_RATE_MODEL_;
    IFeeRateModel public _MT_FEE_RATE_MODEL_;
    IExternalValue public _K_;
    IExternalValue public _I_;

    // ============ Events ============

    event SetLpFeeRateModel(address oldAddr, address newAddr);

    event SetMtFeeRateModel(address oldAddr, address newAddr);

    event SetTradePermissionManager(address oldAddr, address newAddr);

    event SetMaintainer(address oldAddr, address newAddr);

    event SetGasPriceSource(address oldAddr, address newAddr);

    event SetISource(address oldAddr, address newAddr);

    event SetKSource(address oldAddr, address newAddr);

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

    function setISource(address newISource) external onlyOwner {
        emit SetISource(address(_I_), newISource);
        _I_ = IExternalValue(newISource);
        _checkIK();
    }

    function setKSource(address newKSource) external onlyOwner {
        emit SetKSource(address(_K_), newKSource);
        _K_ = IExternalValue(newKSource);
        _checkIK();
    }

    function setBuy(bool open) external onlyOwner {
        emit SetBuy(open);
        _BUYING_CLOSE_ = !open;
    }

    function setSell(bool open) external onlyOwner {
        emit SetSell(open);
        _SELLING_CLOSE_ = !open;
    }

    function _checkIK() internal view {
        uint256 k = _K_.get();
        uint256 i = _I_.get();
        require(k <= 1e18, "K_OUT_OF_RANGE");
        require(i > 0 && i <= 1e36, "I_OUT_OF_RANGE");
    }
}
