/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IFeeRateModel} from "../../lib/FeeRateModel.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IExternalValue} from "../../lib/ExternalValue.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {DVMTrader} from "./DVMTrader.sol";
import {DVMFunding} from "./DVMFunding.sol";
import {DVMVault} from "./DVMVault.sol";

contract DVM is DVMTrader, DVMFunding {
    function init(
        address owner,
        address maintainer,
        address baseTokenAddress,
        address quoteTokenAddress,
        address lpFeeRateModel,
        address mtFeeRateModel,
        address tradePermissionManager,
        address gasPriceSource,
        uint256 i,
        uint256 k
    ) external {
        initOwner(owner);

        require(baseTokenAddress != quoteTokenAddress, "BASE_QUOTE_CAN_NOT_BE_SAME");
        _BASE_TOKEN_ = IERC20(baseTokenAddress);
        _QUOTE_TOKEN_ = IERC20(quoteTokenAddress);

        require(i > 0 && i <= 10**36);
        _I_ = i;

        require(k > 0 && k <= 10**18);
        _K_ = k;

        _LP_FEE_RATE_MODEL_ = IFeeRateModel(lpFeeRateModel);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(mtFeeRateModel);
        _TRADE_PERMISSION_ = IPermissionManager(tradePermissionManager);
        _GAS_PRICE_LIMIT_ = IExternalValue(gasPriceSource);
        _MAINTAINER_ = maintainer;

        string memory connect = "_";
        string memory suffix = "DLP";

        name = string(abi.encodePacked(suffix, connect, addressToShortString(address(this))));
        symbol = "DLP";
        decimals = _BASE_TOKEN_.decimals();

        // ============================== Permit ====================================
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                // keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f,
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
        // ==========================================================================
    }

    function addressToShortString(address _addr) public pure returns (string memory) {
        bytes32 value = bytes32(uint256(_addr));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(8);
        for (uint256 i = 0; i < 4; i++) {
            str[i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[1 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    // ============ Version Control ============
    function version() external pure returns (string memory) {
        return "DVM 1.0.0";
    }
}
