/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {Ownable} from "../lib/Ownable.sol";

contract FeeDistributor is InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============

    address public _BASE_TOKEN_;
    address public _QUOTE_TOKEN_;
    uint256 public _BASE_RESERVE_;
    uint256 public _QUOTE_RESERVE_;
    uint256 public _BASE_REWARD_RATIO_;
    uint256 public _QUOTE_REWARD_RATIO_;

    address public _STAKE_VAULT_;
    address public _STAKE_TOKEN_;
    uint256 public _STAKE_RESERVE_;
    mapping(address => uint256) internal _BASE_DEBT_;
    mapping(address => uint256) internal _QUOTE_DEBT_;
    mapping(address => uint256) internal _SHARES_;


    function init(
      address baseToken,
      address quoteToken,
      address stakeToken
    ) external {
        _BASE_TOKEN_ = baseToken;
        _QUOTE_TOKEN_ = quoteToken;
        _STAKE_TOKEN_ = stakeToken;
        _BASE_REWARD_RATIO_ = DecimalMath.ONE;
        _QUOTE_REWARD_RATIO_ = DecimalMath.ONE;
        _STAKE_VAULT_ = address(new StakeVault());
    }

    //TODO: 用户的手续费base or quote 直接转到该合约中，stakeVault保存的是？
    function stake(address to) external {
      _accuReward();
      uint256 stakeVault = IERC20(_STAKE_TOKEN_).balanceOf(_STAKE_VAULT_);
      uint256 stakeInput = stakeVault.sub(_STAKE_RESERVE_);
      _addShares(stakeInput, to);
    }

    function claim(address to) external {
      _accuReward();
      _claim(msg.sender, to);
    }

    function unstake(uint256 amount, address to, bool withClaim) external {
      require(_SHARES_[msg.sender]>=amount, "STAKE BALANCE ONT ENOUGH");
      _accuReward();

      if (withClaim) {
        _claim(msg.sender, to);
      }

      _removeShares(amount, msg.sender);
      StakeVault(_STAKE_VAULT_).transferOut(_STAKE_TOKEN_, amount, to);
    }

    function _claim(address sender, address to) internal {
      uint256 allBase = DecimalMath.mulFloor(_SHARES_[sender], _BASE_REWARD_RATIO_);
      uint256 allQuote = DecimalMath.mulFloor(_SHARES_[sender], _QUOTE_REWARD_RATIO_);
      IERC20(_BASE_TOKEN_).safeTransfer(to, allBase.sub(_BASE_DEBT_[sender]));
      IERC20(_QUOTE_TOKEN_).safeTransfer(to, allQuote.sub(_QUOTE_DEBT_[sender]));
      _BASE_DEBT_[sender] = allBase;
      _QUOTE_DEBT_[sender] = allQuote;
    }

    function _addShares(uint256 amount, address to) internal {
      _SHARES_[to] = _SHARES_[to].add(amount);
      _BASE_DEBT_[to] = _BASE_DEBT_[to].add(DecimalMath.mulCeil(amount, _BASE_REWARD_RATIO_));
      _QUOTE_DEBT_[to] = _QUOTE_DEBT_[to].add(DecimalMath.mulCeil(amount, _QUOTE_REWARD_RATIO_));
      _STAKE_RESERVE_ = IERC20(_STAKE_TOKEN_).balanceOf(_STAKE_VAULT_);
    }

    function _removeShares(uint256 amount, address from) internal {
      _SHARES_[from] = _SHARES_[from].sub(amount);
      _BASE_DEBT_[from] = _BASE_DEBT_[from].sub(DecimalMath.mulFloor(amount, _BASE_REWARD_RATIO_));
      _QUOTE_DEBT_[from] = _QUOTE_DEBT_[from].sub(DecimalMath.mulFloor(amount, _QUOTE_REWARD_RATIO_));
      _STAKE_RESERVE_ = IERC20(_STAKE_TOKEN_).balanceOf(_STAKE_VAULT_);
    }

    function _accuReward() internal {
      uint256 baseInput = IERC20(_BASE_TOKEN_).balanceOf(address(this)).sub(_BASE_RESERVE_);
      uint256 quoteInput = IERC20(_QUOTE_TOKEN_).balanceOf(address(this)).sub(_QUOTE_RESERVE_);
      _BASE_REWARD_RATIO_ = _BASE_REWARD_RATIO_.add(DecimalMath.divFloor(baseInput, _STAKE_RESERVE_));
      _QUOTE_REWARD_RATIO_ = _QUOTE_REWARD_RATIO_.add(DecimalMath.divFloor(quoteInput, _STAKE_RESERVE_));
      _BASE_RESERVE_ = _BASE_RESERVE_.add(baseInput);
      _QUOTE_RESERVE_ = _QUOTE_RESERVE_.add(quoteInput);
    }

}

contract StakeVault is Ownable {
    using SafeERC20 for IERC20;
    
    function transferOut(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
