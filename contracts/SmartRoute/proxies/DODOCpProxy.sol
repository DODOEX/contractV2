/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;

import {IDODOApproveProxy} from "../DODOApproveProxy.sol";
import {IDODOV2} from "./../intf/IDODOV2.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IWETH} from "../../intf/IWETH.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";

/**
 * @title DODOCpProxy
 * @author DODO Breeder
 *
 * @notice CrowdPooling && UpCrowdPooling Proxy
 */
contract DODOCpProxy is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;
    address public immutable _CP_FACTORY_;

    // ============ Modifiers ============

    modifier judgeExpired(uint256 deadLine) {
        require(deadLine >= block.timestamp, "DODOCpProxy: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor(
        address payable weth,
        address cpFactory,
        address dodoApproveProxy
    ) public {
        _WETH_ = weth;
        _CP_FACTORY_ = cpFactory;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }

    //============ CrowdPooling Functions (create) ============

    function createCrowdPooling(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256[] memory timeLine,
        uint256[] memory valueList,
        bool[] memory switches,
        uint256 deadLine,
        int globalQuota
    ) external payable preventReentrant judgeExpired(deadLine) returns (address payable newCrowdPooling) {
        address _baseToken = baseToken;
        address _quoteToken = quoteToken == _ETH_ADDRESS_ ? _WETH_ : quoteToken;
        
        newCrowdPooling = IDODOV2(_CP_FACTORY_).createCrowdPooling();

        _deposit(
            msg.sender,
            newCrowdPooling,
            _baseToken,
            baseInAmount,
            false
        );
        
        (bool success, ) = newCrowdPooling.call{value: msg.value}("");
        require(success, "DODOCpProxy: Transfer failed");

        address[] memory tokens = new address[](2);
        tokens[0] = _baseToken;
        tokens[1] = _quoteToken;

        IDODOV2(_CP_FACTORY_).initCrowdPooling(
            newCrowdPooling,
            msg.sender,
            tokens,
            timeLine,
            valueList,
            switches,
            globalQuota
        );
    }

    function bid(
        address cpAddress,
        uint256 quoteAmount,
        uint8 flag, // 0 - ERC20, 1 - quoteInETH
        uint256 deadLine
    ) external payable preventReentrant judgeExpired(deadLine) {
        _deposit(msg.sender, cpAddress, IDODOV2(cpAddress)._QUOTE_TOKEN_(), quoteAmount, flag == 1);
        IDODOV2(cpAddress).bid(msg.sender);
    }

    //====================== internal =======================

    function _deposit(
        address from,
        address to,
        address token,
        uint256 amount,
        bool isETH
    ) internal {
        if (isETH) {
            if (amount > 0) {
                require(msg.value == amount, "ETH_VALUE_WRONG");
                IWETH(_WETH_).deposit{value: amount}();
                if (to != address(this)) SafeERC20.safeTransfer(IERC20(_WETH_), to, amount);
            }
        } else {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(token, from, to, amount);
        }
    }
}