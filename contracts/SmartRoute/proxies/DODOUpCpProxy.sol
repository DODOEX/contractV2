/*

    Copyright 2020 DODO ZOO.
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
 * @title DODOUpCpProxy
 * @author DODO Breeder
 *
 * @notice UpCrowdPooling Proxy (temporary)
 */
contract DODOUpCpProxy is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _UPCP_FACTORY_;

    fallback() external payable {}

    receive() external payable {}

    constructor(
        address upCpFactory,
        address payable weth
    ) public {
        _UPCP_FACTORY_ = upCpFactory;
        _WETH_ = weth;
    }

    //============ UpCrowdPooling Functions (create) ============

    function createUpCrowdPooling(
        address creator,
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256[] memory timeLine,
        uint256[] memory valueList,
        bool isOpenTWAP
    ) external payable preventReentrant returns (address payable newUpCrowdPooling) {
        address _baseToken = baseToken;
        address _quoteToken = quoteToken == _ETH_ADDRESS_ ? _WETH_ : quoteToken;
        
        newUpCrowdPooling = IDODOV2(_UPCP_FACTORY_).createCrowdPooling();

        IERC20(_baseToken).transferFrom(msg.sender, newUpCrowdPooling, baseInAmount);

        newUpCrowdPooling.transfer(msg.value);

        IDODOV2(_UPCP_FACTORY_).initCrowdPooling(
            newUpCrowdPooling,
            creator,
            _baseToken,
            _quoteToken,
            timeLine,
            valueList,
            isOpenTWAP
        );
    }
}
