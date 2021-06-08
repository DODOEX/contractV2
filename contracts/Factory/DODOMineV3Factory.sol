/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {IDODOApproveProxy} from "../SmartRoute/DODOApproveProxy.sol";
import {IRewardVault} from "../DODOToken/DODOMineV3/RewardVault.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {SafeMath} from "../lib/SafeMath.sol";

interface IMineV3 {
    function init(address owner, address token) external;

    function addRewardToken(
        address rewardToken,
        uint256 rewardPerBlock,
        uint256 startBlock,
        uint256 endBlock
    ) external;

    function getVaultByRewardToken(address rewardToken) external view returns(address);

    function directTransferOwnership(address newOwner) external;
}

/**
 * @title DODOMineV3 Factory
 * @author DODO Breeder
 *
 * @notice Create And Register DODOMineV3 Contracts 
 */
contract DODOMineV3Factory is InitializableOwnable {
    using SafeMath for uint256;
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public _MINEV3_TEMPLATE_;
    address public _DODO_APPROVE_PROXY_;
    mapping (address => bool) public singleTokenList;

    // minePool -> stakeToken
    mapping(address => address) public _MINE_REGISTRY_;
    // lpToken -> minePool
    mapping(address => address) public _LP_REGISTRY_;
    // singleToken -> minePool
    mapping(address => address[]) public _SINGLE_REGISTRY_;

    // ============ Events ============

    event NewMineV3(address mine, address stakeToken, bool isLpToken);
    event RemoveMineV3(address mine, address stakeToken);

    constructor(
        address cloneFactory,
        address mineTemplate,
        address dodoApproveProxy
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _MINEV3_TEMPLATE_ = mineTemplate;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }

    // ============ Functions ============

    function createDODOMineV3(
        address stakeToken,
        bool isLpToken,
        address[] memory rewardTokens,
        uint256[] memory rewardPerBlock,
        uint256[] memory startBlock,
        uint256[] memory endBlock
    ) external returns (address newMineV3) {
        require(rewardTokens.length > 0, "REWARD_EMPTY");
        require(rewardTokens.length == rewardPerBlock.length, "REWARD_PARAM_NOT_MATCH");
        require(startBlock.length == rewardPerBlock.length, "REWARD_PARAM_NOT_MATCH");
        require(endBlock.length == rewardPerBlock.length, "REWARD_PARAM_NOT_MATCH");

        newMineV3 = ICloneFactory(_CLONE_FACTORY_).clone(_MINEV3_TEMPLATE_);

        IMineV3(newMineV3).init(address(this), stakeToken);

        for(uint i = 0; i<rewardTokens.length; i++) {
            IMineV3(newMineV3).addRewardToken(
                rewardTokens[i],
                rewardPerBlock[i],
                startBlock[i],
                endBlock[i]
            );

            address rewardVault = IMineV3(newMineV3).getVaultByRewardToken(rewardTokens[i]);
            uint256 rewardAmount = rewardPerBlock[i].mul(endBlock[i].sub(startBlock[i]));
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(rewardTokens[i], msg.sender, rewardVault, rewardAmount);
            IRewardVault(rewardVault).depositReward();
        }

        IMineV3(newMineV3).directTransferOwnership(msg.sender);

        _MINE_REGISTRY_[newMineV3] = stakeToken;
        if(isLpToken) {
            _LP_REGISTRY_[stakeToken] = newMineV3;
        }else {
            require(_SINGLE_REGISTRY_[stakeToken].length == 0 || singleTokenList[stakeToken], "ALREADY_EXSIT_POOL");
            _SINGLE_REGISTRY_[stakeToken].push(newMineV3);
        }

        emit NewMineV3(newMineV3, stakeToken, isLpToken);
    }

    // ============ Admin Operation Functions ============
    
    function updateMineV2Template(address _newMineV3Template) external onlyOwner {
        _MINEV3_TEMPLATE_ = _newMineV3Template;
    }


    function addByAdmin(
        address mine,
        bool isLpToken,
        address stakeToken
    ) external onlyOwner {
        _MINE_REGISTRY_[mine] = stakeToken;
        if(isLpToken) {
            _LP_REGISTRY_[stakeToken] = mine;
        }else {
            require(_SINGLE_REGISTRY_[stakeToken].length == 0 || singleTokenList[stakeToken], "ALREADY_EXSIT_POOL");
            _SINGLE_REGISTRY_[stakeToken].push(mine);
        }

        emit NewMineV3(mine, stakeToken, isLpToken);
    }

    function removeByAdmin(
        address mine,
        bool isLpToken,
        address stakeToken
    ) external onlyOwner {
        _MINE_REGISTRY_[mine] = address(0);
        if(isLpToken) {
            _LP_REGISTRY_[stakeToken] = address(0);
        }else {
            uint256 len = _SINGLE_REGISTRY_[stakeToken].length;
            for (uint256 i = 0; i < len; i++) {
                if (stakeToken == _SINGLE_REGISTRY_[stakeToken][i]) {
                    if(i != len - 1) {
                        _SINGLE_REGISTRY_[stakeToken][i] = _SINGLE_REGISTRY_[stakeToken][len - 1];
                    }
                    _SINGLE_REGISTRY_[stakeToken].pop();
                    break;
                }
            }
        }

        emit RemoveMineV3(mine, stakeToken);
    }

}
