/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IFeeRateModel} from "../../../lib/FeeRateModel.sol";
import {IERC20} from "../../../intf/IERC20.sol";
import {DPPTrader} from "./DPPTrader.sol";

/**
 * @title DODO PrivatePool
 * @author DODO Breeder
 *
 * @notice DODOPrivatePool with oracle price
 */
contract DPPOracle is DPPTrader {

    event EnableOracle();
    event DisableOracle(uint256 newI);
    event ChangeOracle(address indexed oracle);

    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        uint256 lpFeeRate,
        address mtFeeRateModel,
        uint256 k,
        uint256 i,
        address o,
        bool isOpenTWAP,
        bool isOracleEnabled
    ) external {
        initOwner(owner);

        require(baseTokenAddress != quoteTokenAddress, "BASE_QUOTE_CAN_NOT_BE_SAME");
        _BASE_TOKEN_ = IERC20(baseTokenAddress);
        _QUOTE_TOKEN_ = IERC20(quoteTokenAddress);

        _MAINTAINER_ = maintainer;
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(mtFeeRateModel);
        
        require(lpFeeRate <= 1e18, "LP_FEE_RATE_OUT_OF_RANGE");
        require(k <= 1e18, "K_OUT_OF_RANGE");
        require(i > 0 && i <= 1e36, "I_OUT_OF_RANGE");
        require(o !=  address(0), "INVALID_ORACLE");

        _LP_FEE_RATE_ = uint64(lpFeeRate);
        _K_ = uint64(k);
        _I_ = uint128(i);
        _O_ = o;

        _IS_OPEN_TWAP_ = isOpenTWAP;
        _IS_ORACLE_ENABLED = isOracleEnabled;
        if(isOpenTWAP) _BLOCK_TIMESTAMP_LAST_ = uint32(block.timestamp % 2**32);
        
        _resetTargetAndReserve();
    }

    function changeOracle(address newOracle) public preventReentrant onlyOwner {
        require(newOracle !=  address(0), "INVALID_ORACLE");
        _O_ = newOracle;
        emit ChangeOracle(newOracle);
    }

    function enableOracle() public preventReentrant onlyOwner {
        _IS_ORACLE_ENABLED = true;
        emit EnableOracle();
    }

    function disableOracle(uint256 newI) public preventReentrant onlyOwner {
        require(newI > 0 && newI <= 1e36, "I_OUT_OF_RANGE");
        _I_ = uint128(newI);
        _IS_ORACLE_ENABLED = false;
        emit DisableOracle(newI);
    }

    function tuneParameters(
        uint256 newLpFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 minBaseReserve,
        uint256 minQuoteReserve
    ) public preventReentrant onlyOwner returns (bool) {
        require(
            _BASE_RESERVE_ >= minBaseReserve && _QUOTE_RESERVE_ >= minQuoteReserve,
            "RESERVE_AMOUNT_IS_NOT_ENOUGH"
        );
        require(newLpFeeRate <= 1e18, "LP_FEE_RATE_OUT_OF_RANGE");
        require(newK <= 1e18, "K_OUT_OF_RANGE");
        require(newI > 0 && newI <= 1e36, "I_OUT_OF_RANGE");

        _LP_FEE_RATE_ = uint64(newLpFeeRate);
        _K_ = uint64(newK);
        _I_ = uint128(newI);

        emit LpFeeRateChange(newLpFeeRate);
        return true;
    }

    function tunePrice(
        uint256 newI,
        uint256 minBaseReserve,
        uint256 minQuoteReserve
    ) public preventReentrant onlyOwner returns (bool) {
        require(
            _BASE_RESERVE_ >= minBaseReserve && _QUOTE_RESERVE_ >= minQuoteReserve,
            "RESERVE_AMOUNT_IS_NOT_ENOUGH"
        );
        require(newI > 0 && newI <= 1e36, "I_OUT_OF_RANGE");
        _I_ = uint128(newI);
        return true;
    }


    // ============ Version Control ============

    function version() external pure returns (string memory) {
        return "DPP Oracle 1.1.0";
    }
}
