/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {IERC20} from "../intf/IERC20.sol";


contract DODOIncentive is InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    // ============ Storage ============
    address public immutable _DODO_TOKEN_;
    address public _DODO_PROXY_;
    uint256 public dodoPerBlock;
    uint256 public defaultRate;
    uint256 public startBlock; 
    mapping(address => uint256) public boosts;
    
    uint32 public lastRewardBlock;
    uint112 public totalReward;
    uint112 public totalDistribution;

    constructor(address _dodoToken, address _dodoProxy) public {
        _DODO_TOKEN_ = _dodoToken;
        _DODO_PROXY_ = _dodoProxy;
    }

    // ============ Events ============

    event SetBoost(address token, uint256 boostRate);
    event SetSwitch(bool isOpen);
    event SetPerReward(uint256 dodoPerBlock);
    event SetDefaultRate(uint256 defaultRate);
    event Incentive(address user,uint256 reward, address fromToken, address toToken);

    // ============ Ownable ============

    function switchIncentive(uint256 _startBlock) public onlyOwner {
        if(startBlock != 0) {
            require(block.number >= startBlock);
            startBlock = 0;
        }else {
            require(block.number <= _startBlock);
            startBlock = _startBlock;
        }
        _update();
        emit SetSwitch(startBlock == 0 ? false: true);
    }

    function changeBoost(address _token, uint256 _boostRate) public onlyOwner {
        require(_token != address(0));
        require(_boostRate <= 1000);
        boosts[_token] = _boostRate;
        emit SetBoost(_token,_boostRate);
    }

    function changePerReward(uint256 _dodoPerBlock) public onlyOwner {
        _update();
        dodoPerBlock = _dodoPerBlock;
        emit SetPerReward(dodoPerBlock);
    }

    function changeDefaultRate(uint256 _defaultRate) public onlyOwner {
        defaultRate = _defaultRate;
        emit SetDefaultRate(defaultRate);
    }

    function emptyReward(address assetTo) public onlyOwner {
        uint256 balance = IERC20(_DODO_TOKEN_).balanceOf(address(this));
        IERC20(_DODO_TOKEN_).transfer(assetTo, balance);
    }


    // ============ Incentive  function============
    function triggerIncentive(address fromToken,address toToken, address assetTo) external {
        require(msg.sender == _DODO_PROXY_, "DODOIncentive:Access restricted");
        if(startBlock == 0 || block.number < startBlock) return;

        uint256 curTotalDistribution = totalDistribution;
        uint256 fromRate = boosts[fromToken];
        uint256 toRate = boosts[toToken];
        uint256 rate = (fromRate >= toRate ? fromRate : toRate).add(defaultRate);
        _update();
        uint256 reward = uint256(totalReward).sub(curTotalDistribution).mul(rate).div(1000);

        uint256 _totalDistribution = curTotalDistribution.add(reward);
        require(_totalDistribution < uint112(-1), "OVERFLOW");
        totalDistribution = uint112(_totalDistribution);

        IERC20(_DODO_TOKEN_).transfer(assetTo,reward);
        emit Incentive(assetTo,reward,fromToken,toToken);
    }

        
    function _update() internal {
        uint256 _totalReward = uint256(totalReward).add(block.number.sub(uint256(lastRewardBlock)).mul(dodoPerBlock));
        require(_totalReward < uint112(-1) && block.number < uint32(-1), "OVERFLOW");
        totalReward = uint112(_totalReward);
        lastRewardBlock = uint32(block.number);
    }
}