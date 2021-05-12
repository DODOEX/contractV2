/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {Ownable} from "../lib/Ownable.sol";

contract FeeDistributor {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============

    address public _BASE_TOKEN_;
    address public _QUOTE_TOKEN_;
    uint256 public _BASE_RESERVE_;
    uint256 public _QUOTE_RESERVE_;

    address public _STAKE_VAULT_;
    address public _STAKE_TOKEN_;
    uint256 public _STAKE_RESERVE_;

    uint256 public _BASE_REWARD_RATIO_;
    mapping(address => uint256) public _USER_BASE_REWARDS_;
    mapping(address => uint256) public _USER_BASE_PER_SHARE_;

    uint256 public _QUOTE_REWARD_RATIO_;
    mapping(address => uint256) public _USER_QUOTE_REWARDS_;
    mapping(address => uint256) public _USER_QUOTE_PER_SHARE_;

    mapping(address => uint256) public _SHARES_;

    bool internal _FEE_INITIALIZED_;

    // ============ Event ============
    event Stake(address sender, uint256 amount);
    event UnStake(address sender, uint256 amount);
    event Claim(address sender, uint256 baseAmount, uint256 quoteAmount);

    function init(
        address baseToken,
        address quoteToken,
        address stakeToken
    ) external {
        require(!_FEE_INITIALIZED_, "ALREADY_INITIALIZED");
        _FEE_INITIALIZED_ = true;

        _BASE_TOKEN_ = baseToken;
        _QUOTE_TOKEN_ = quoteToken;
        _STAKE_TOKEN_ = stakeToken;
        _STAKE_VAULT_ = address(new StakeVault());
    }

    function stake(address to) external {
        _updateGlobalState();
        _updateUserReward(to);
        uint256 stakeVault = IERC20(_STAKE_TOKEN_).balanceOf(_STAKE_VAULT_);
        uint256 stakeInput = stakeVault.sub(_STAKE_RESERVE_);
        _addShares(stakeInput, to);
        emit Stake(to, stakeInput);
    }

    function claim(address to) external {
        _updateGlobalState();
        _updateUserReward(msg.sender);
        _claim(msg.sender, to);
    }

    function unstake(
        uint256 amount,
        address to,
        bool withClaim
    ) external {
        require(_SHARES_[msg.sender] >= amount, "STAKE BALANCE ONT ENOUGH");
        _updateGlobalState();
        _updateUserReward(msg.sender);

        if (withClaim) {
            _claim(msg.sender, to);
        }
        _removeShares(amount, msg.sender);
        StakeVault(_STAKE_VAULT_).transferOut(_STAKE_TOKEN_, amount, to);
        
        emit UnStake(msg.sender, amount);
    }

    // ============ View ================
    function getPendingReward(address user)
        external
        view
        returns (uint256 baseReward, uint256 quoteReward)
    {
        uint256 baseInput = IERC20(_BASE_TOKEN_).balanceOf(address(this)).sub(_BASE_RESERVE_);
        uint256 quoteInput = IERC20(_QUOTE_TOKEN_).balanceOf(address(this)).sub(_QUOTE_RESERVE_);
        uint256 baseRwardRatio = _BASE_REWARD_RATIO_;
        uint256 quoteRewardRatio = _QUOTE_REWARD_RATIO_;
        if (_STAKE_RESERVE_ != 0) {
            baseRwardRatio = _BASE_REWARD_RATIO_.add(
                DecimalMath.divFloor(baseInput, _STAKE_RESERVE_)
            );
            quoteRewardRatio = _QUOTE_REWARD_RATIO_.add(
                DecimalMath.divFloor(quoteInput, _STAKE_RESERVE_)
            );
        }
        baseReward = DecimalMath
            .mulFloor(_SHARES_[user], baseRwardRatio.sub(_USER_BASE_PER_SHARE_[user]))
            .add(_USER_BASE_REWARDS_[user]);
        quoteReward = DecimalMath
            .mulFloor(_SHARES_[user], quoteRewardRatio.sub(_USER_QUOTE_PER_SHARE_[user]))
            .add(_USER_QUOTE_REWARDS_[user]);
    }

    // ============ Internal  ============

    function _claim(address sender, address to) internal {
        uint256 allBase = _USER_BASE_REWARDS_[sender];
        uint256 allQuote = _USER_QUOTE_REWARDS_[sender];

        _BASE_RESERVE_ = _BASE_RESERVE_.sub(allBase);
        _QUOTE_RESERVE_ = _QUOTE_RESERVE_.sub(allQuote);
        _USER_BASE_REWARDS_[sender] = 0;
        _USER_QUOTE_REWARDS_[sender] = 0;

        IERC20(_BASE_TOKEN_).safeTransfer(to, allBase);
        IERC20(_QUOTE_TOKEN_).safeTransfer(to, allQuote);
        
        emit Claim(sender, allBase, allQuote);
    }

    function _updateGlobalState() internal {
        uint256 baseInput = IERC20(_BASE_TOKEN_).balanceOf(address(this)).sub(_BASE_RESERVE_);
        uint256 quoteInput = IERC20(_QUOTE_TOKEN_).balanceOf(address(this)).sub(_QUOTE_RESERVE_);

        if (_STAKE_RESERVE_ != 0) {
            _BASE_REWARD_RATIO_ = _BASE_REWARD_RATIO_.add(
                DecimalMath.divFloor(baseInput, _STAKE_RESERVE_)
            );
            _QUOTE_REWARD_RATIO_ = _QUOTE_REWARD_RATIO_.add(
                DecimalMath.divFloor(quoteInput, _STAKE_RESERVE_)
            );
        }

        _BASE_RESERVE_ = _BASE_RESERVE_.add(baseInput);
        _QUOTE_RESERVE_ = _QUOTE_RESERVE_.add(quoteInput);
    }

    function _updateUserReward(address user) internal {
        _USER_BASE_REWARDS_[user] = DecimalMath
            .mulFloor(_SHARES_[user], _BASE_REWARD_RATIO_.sub(_USER_BASE_PER_SHARE_[user]))
            .add(_USER_BASE_REWARDS_[user]);

        _USER_BASE_PER_SHARE_[user] = _BASE_REWARD_RATIO_;

        _USER_QUOTE_REWARDS_[user] = DecimalMath
            .mulFloor(_SHARES_[user], _QUOTE_REWARD_RATIO_.sub(_USER_QUOTE_PER_SHARE_[user]))
            .add(_USER_QUOTE_REWARDS_[user]);

        _USER_QUOTE_PER_SHARE_[user] = _QUOTE_REWARD_RATIO_;
    }

    function _addShares(uint256 amount, address to) internal {
        _SHARES_[to] = _SHARES_[to].add(amount);
        _STAKE_RESERVE_ = IERC20(_STAKE_TOKEN_).balanceOf(_STAKE_VAULT_);
    }

    function _removeShares(uint256 amount, address from) internal {
        _SHARES_[from] = _SHARES_[from].sub(amount);
        _STAKE_RESERVE_ = IERC20(_STAKE_TOKEN_).balanceOf(_STAKE_VAULT_);
    }
}

contract StakeVault is Ownable {
    using SafeERC20 for IERC20;

    function transferOut(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        if (amount > 0) {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
