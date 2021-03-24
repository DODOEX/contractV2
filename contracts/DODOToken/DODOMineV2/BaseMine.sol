/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {IRewardVault, RewardVault} from "./RewardVault.sol";


contract BaseMine is InitializableOwnable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // ============ Storage ============
    
    struct RewardTokenInfo {
        address rewardToken;
        uint256 startBlock;
        uint256 endBlock;
        address rewardVault;
        address rewardDistributor;

        uint256 rewardPerBlock;
        uint256 accRewardPerShare;
        uint256 lastRewardBlock;

        mapping(address => uint256) userRewardPerTokenPaid;
        mapping(address => uint256) userRewards;
    }

    RewardTokenInfo[] public rewardTokenInfos;

    uint256 internal _totalSupply;
    mapping(address => uint256) internal _balances;

    // ============ Event =============

    event Claim(uint256 indexed i, address indexed user, uint256 reward);
    event UpdateReward(uint256 indexed i, uint256 rewardPerBlock);
    event UpdateEndBlock(uint256 indexed i, uint256 endBlock);
    event RewardDistributorChanged(uint256 indexed i, address rewardDistributor);
    event NewRewardToken(uint256 indexed i, address rewardToken);
    event RemoveRewardToken(address rewardToken);

    // ============ Modifier ==========

    modifier onlyRewardDistributor(uint i) {
        require(msg.sender == rewardTokenInfos[i].rewardDistributor, "DODOMineV2: ACCESS_RESTRICTED");
        _;
    }

    modifier updateReward(address user) {
        uint256 len = rewardTokenInfos.length;
        for (uint i = 0; i < len; i++) {
            RewardTokenInfo storage rt = rewardTokenInfos[i];
            rt.accRewardPerShare = rewardPerLpToken(i);
            rt.lastRewardBlock = lastBlockRewardApplicable(i);
            if (user != address(0)) {
                rt.userRewards[user] = getPendingReward(i, user);
                rt.userRewardPerTokenPaid[user] = rt.accRewardPerShare;
            }
        }
        _;
    }

    // ============ View  ============

    function lastBlockRewardApplicable(uint i) public view returns (uint256) {
        uint256 startBlock = rewardTokenInfos[i].startBlock;
        uint256 endBlock = rewardTokenInfos[i].endBlock;
        if(block.number < endBlock) {
            if(block.number < startBlock) 
                return startBlock;
            else 
                return block.number;
        }else {
            return endBlock;
        }
    }

    function rewardPerLpToken(uint i) public view returns (uint256) {
        RewardTokenInfo memory rt = rewardTokenInfos[i];
        if (totalSupply() == 0) {
            return rt.accRewardPerShare;
        }
        return rt.accRewardPerShare.add(
            DecimalMath.divFloor(
                lastBlockRewardApplicable(i).sub(rt.lastRewardBlock).mul(rt.rewardPerBlock), 
                totalSupply()
            )
        );
    }

    function getPendingReward(uint i, address user) public view returns (uint256) {
        RewardTokenInfo storage rt = rewardTokenInfos[i];
        return DecimalMath.mulFloor(
            balanceOf(user),
            rewardPerLpToken(i).sub(rt.userRewardPerTokenPaid[user])
        ).add(rt.userRewards[user]);
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address user) public view returns (uint256) {
        return _balances[user];
    }

    // ============ Claim ============

    function getReward(uint i) public updateReward(msg.sender) {
        RewardTokenInfo storage rt = rewardTokenInfos[i];
        uint256 reward = rt.userRewards[msg.sender];
        if (reward > 0) {
            rt.userRewards[msg.sender] = 0;
            IRewardVault(rt.rewardVault).reward(msg.sender, reward);
            emit Claim(i, msg.sender, reward);
        }
    }

    function getAllRewards() public {
        uint256 len = rewardTokenInfos.length;
        for (uint i = 0; i < len; i++) {
            getReward(i);
        }
    }

    // =============== Ownable  ================

    function setRewardDistribution(uint i, address rewardDistributor) external onlyOwner {
        RewardTokenInfo storage rt = rewardTokenInfos[i];
        rt.rewardDistributor = rewardDistributor;
        emit RewardDistributorChanged(i, rewardDistributor);
    }

    function addRewardToken(address rewardToken, address rewardDistributor,uint256 startBlock, uint256 endBlock) external onlyOwner {
        require(rewardToken != address(0),"DODOMineV2: TOKEN_INVALID");
        require(startBlock > block.number, "DODOMineV2: START_BLOCK_INVALID");
        require(endBlock > startBlock ,"DODOMineV2: DURATION_INVALID");
        require(rewardDistributor != address(0), "DODOMineV2: REWARD_DISTRIBUTOR_INVALID");

        uint256 len = rewardTokenInfos.length;
        for (uint i = 0; i < len; i++) {
            require(rewardToken != rewardTokenInfos[i].rewardToken, "DODOMineV2: TOKEN_ALREADY_ADDED");
        }

        RewardTokenInfo storage rt = rewardTokenInfos.push();
        rt.rewardToken = rewardToken;
        rt.startBlock = startBlock;
        rt.endBlock = endBlock;
        rt.rewardDistributor = rewardDistributor;
        rt.rewardVault = address(new RewardVault(rewardToken));

        emit NewRewardToken(len, rewardToken);
        emit RewardDistributorChanged(len, rewardDistributor);
    }

    function removeRewardToken(address rewardToken) external onlyOwner {
        uint256 len = rewardTokenInfos.length;
        for (uint256 i = 0; i < len; i++) {
            if (rewardToken == rewardTokenInfos[i].rewardToken) {
                rewardTokenInfos[i] = rewardTokenInfos[len - 1];
                rewardTokenInfos.pop();
                emit RemoveRewardToken(rewardToken);
                break;
            }
        }
    }

    function setEndBlock(uint i, uint256 newEndBlock) external onlyRewardDistributor(i) updateReward(address(0)) {
        require(block.number < newEndBlock, "DODOMineV2: END_BLOCK_INVALID");
        RewardTokenInfo storage rt = rewardTokenInfos[i];
        require(block.number > rt.startBlock, "DODOMineV2: NOT_START");
        require(block.number < rt.endBlock, "DODOMineV2: ALREADY_CLOSE");
        
        //TODO: gas ？需要额外维护 已分发reward变量，总reward 两个storage
        // uint256 vaultBalance = IERC20(rt.rewardToken).balanceOf(rt.rewardVault);
        // uint256 preReward = DecimalMath.mulFloor(newEndBlock.sub(block.number), rt.rewardPerBlock);
        // require(preReward <= vaultBalance, "DODOMineV2: REWARD_NOT_ENOUGH");
        
        rt.endBlock = newEndBlock;
        rt.lastRewardBlock = block.number;
        
        emit UpdateEndBlock(i, newEndBlock);
    }

    function setReward(uint i, uint256 newRewardPerBlock) external onlyRewardDistributor(i) updateReward(address(0)) {
        RewardTokenInfo storage rt = rewardTokenInfos[i];
        uint256 endBlock = rt.endBlock;

        require(block.number < endBlock, "DODOMineV2: ALREADY_FINISHED");

        //TODO: 
        // uint256 vaultBalance = IERC20(rt.rewardToken).balanceOf(rt.rewardVault);
        // uint256 startBlock = rt.startBlock;
        // uint256 preReward;
        // if(startBlock > block.number) {
        //     preReward = DecimalMath.mulFloor(endBlock.sub(startBlock), newRewardPerBlock);
        // }else {
        //     preReward = DecimalMath.mulFloor(endBlock.sub(block.number), newRewardPerBlock);
        // }
        // require(preReward <= vaultBalance, "DODOMineV2: REWARD_NOT_ENOUGH");
        
        rt.rewardPerBlock = newRewardPerBlock;
        emit UpdateReward(i, newRewardPerBlock);
    }
}
