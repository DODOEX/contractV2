/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {ILockedTokenVault02} from "../intf/ILockedTokenVault02.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {IERC20} from "../intf/IERC20.sol";

/**
 * @title DODOIncentiveBsc
 * @author DODO Breeder
 *
 * @notice Trade Incentive in DODO platform
 */
contract DODOIncentiveBsc is InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============
    address public immutable _DODO_TOKEN_;
    address public _DODO_PROXY_;
    address public _LOCKED_VAULT_;

    mapping(address => bool) public stableList;
    mapping(address => bool) public tokenList; //Not include stable tokens
    uint256 public baseAmount = 1000;
    uint256 public baseReward = 10**18;

    // ============ Events ============

    event SetStableList(address token, bool isUse);
    event SetTokenList(address token, bool isUse);
    event SetBaseAmount(uint256 baseAmount);
    event SetBaseReward(uint256 baseReward);
    
    event Incentive(address user, uint256 reward);

    constructor(address _dodoToken) public {
        _DODO_TOKEN_ = _dodoToken;
    }

    // ============ Ownable ============

    function setContract(address dodoProxy,address lockedVault) external onlyOwner {
        _DODO_PROXY_ = dodoProxy;
        _LOCKED_VAULT_ = lockedVault;
    }

    function setStableList(address token, bool isUse) external onlyOwner {
        require(token != address(0));
        stableList[token] = isUse;
        emit SetStableList(token, isUse);
    }

    function setTokenList(address token, bool isUse) external onlyOwner {
        require(token != address(0));
        tokenList[token] = isUse;
        emit SetTokenList(token, isUse);
    }

    function changeBaseAmount(uint256 newBaseAmount) external onlyOwner {
        baseAmount = newBaseAmount;
        emit SetBaseAmount(newBaseAmount);
    }

    function changeBaseReward(uint256 newBaseReward) external onlyOwner {
        baseReward = newBaseReward;
        emit SetBaseAmount(newBaseReward);
    }

    // ============ Incentive  function ============

    function triggerIncentive(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 returnAmount,
        address assetTo
    ) external {
        require(msg.sender == _DODO_PROXY_, "DODOIncentiveBsc:Access restricted");
        uint256 reward = 0;
        if(stableList[fromToken] && tokenList[toToken]) {
            reward = fromAmount.div(baseAmount);
        } else if (stableList[toToken] && tokenList[fromToken]) {
            reward = returnAmount.div(baseAmount);
        }
        if (reward != 0) {
            ILockedTokenVault02(_LOCKED_VAULT_).tradeIncentive(assetTo,reward);
            emit Incentive(assetTo, reward);
        }
    }
}
