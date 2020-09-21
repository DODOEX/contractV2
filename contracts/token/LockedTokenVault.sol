/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {Ownable} from "../lib/Ownable.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {IERC20} from "../intf/IERC20.sol";


/**
 * @title LockedTokenVault
 * @author DODO Breeder
 *
 * @notice Lock Token and release it linearly
 */

contract LockedTokenVault is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address _TOKEN_;

    mapping(address => uint256) internal originBalances;
    mapping(address => uint256) internal claimedBalances;

    mapping(address => address) internal holderTransferRequest;

    uint256 public _UNDISTRIBUTED_AMOUNT_;
    uint256 public _START_RELEASE_TIME_;
    uint256 public _RELEASE_DURATION_;
    uint256 public _CLIFF_RATE_;

    bool public _DISTRIBUTE_FINISHED_;

    // ============ Modifiers ============

    modifier beforeStartRelease() {
        require(block.timestamp < _START_RELEASE_TIME_, "RELEASE START");
        _;
    }

    modifier afterStartRelease() {
        require(block.timestamp > _START_RELEASE_TIME_, "RELEASE NOT START");
        _;
    }

    modifier distributeNotFinished() {
        require(!_DISTRIBUTE_FINISHED_, "DISTRIBUTE FINISHED");
        _;
    }

    // ============ Init Functions ============

    constructor(
        address _token,
        uint256 _startReleaseTime,
        uint256 _releaseDuration,
        uint256 _cliffRate
    ) public {
        _TOKEN_ = _token;
        _START_RELEASE_TIME_ = _startReleaseTime;
        _RELEASE_DURATION_ = _releaseDuration;
        _CLIFF_RATE_ = _cliffRate;
    }

    function deposit(uint256 amount) external onlyOwner {
        _tokenTransferIn(_OWNER_, amount);
        _UNDISTRIBUTED_AMOUNT_ = _UNDISTRIBUTED_AMOUNT_.add(amount);
    }

    function withdraw(uint256 amount) external onlyOwner {
        _UNDISTRIBUTED_AMOUNT_ = _UNDISTRIBUTED_AMOUNT_.sub(amount);
        _tokenTransferOut(_OWNER_, amount);
    }

    function finishDistribute() external onlyOwner {
        _DISTRIBUTE_FINISHED_ = true;
    }

    // ============ For Owner ============

    function grant(address[] calldata holderList, uint256[] calldata amountList)
        external
        onlyOwner
    {
        require(holderList.length == amountList.length, "batch grant length not match");
        uint256 amount = 0;
        for (uint256 i = 0; i < holderList.length; ++i) {
            originBalances[holderList[i]] = originBalances[holderList[i]].add(amountList[i]);
            amount = amount.add(amountList[i]);
        }
        _UNDISTRIBUTED_AMOUNT_ = _UNDISTRIBUTED_AMOUNT_.sub(amount);
    }

    function recall(address holder) external onlyOwner distributeNotFinished {
        uint256 amount = originBalances[holder];
        originBalances[holder] = 0;
        _UNDISTRIBUTED_AMOUNT_ = _UNDISTRIBUTED_AMOUNT_.add(amount);
    }

    // ============ For Holder ============

    function transferLockedToken(address to) external {
        originBalances[to] = originBalances[to].add(originBalances[msg.sender]);
        claimedBalances[to] = claimedBalances[to].add(claimedBalances[msg.sender]);

        originBalances[msg.sender] = 0;
        claimedBalances[msg.sender] = 0;
    }

    function claim() external {
        uint256 claimableToken = getClaimableBalance(msg.sender);
        _tokenTransferOut(msg.sender, claimableToken);
        claimedBalances[msg.sender] = claimedBalances[msg.sender].add(claimableToken);
    }

    // ============ View ============

    function getOriginBalance(address holder) external view returns (uint256) {
        return originBalances[holder];
    }

    function getClaimedBalance(address holder) external view returns (uint256) {
        return claimedBalances[holder];
    }

    function getHolderTransferRequest(address holder) external view returns (address) {
        return holderTransferRequest[holder];
    }

    function getClaimableBalance(address holder) public view returns (uint256) {
        if (block.timestamp < _START_RELEASE_TIME_) {
            return 0;
        }
        uint256 remainingToken = getRemainingBalance(holder);
        return originBalances[holder].sub(remainingToken).sub(claimedBalances[holder]);
    }

    function getRemainingBalance(address holder) public view returns (uint256) {
        uint256 remainingToken = 0;
        uint256 timePast = block.timestamp.sub(_START_RELEASE_TIME_);
        if (timePast < _RELEASE_DURATION_) {
            uint256 remainingTime = _RELEASE_DURATION_.sub(timePast);
            remainingToken = originBalances[holder]
                .sub(DecimalMath.mul(originBalances[holder], _CLIFF_RATE_))
                .mul(remainingTime)
                .div(_RELEASE_DURATION_);
        }
        return remainingToken;
    }

    // ============ Internal Helper ============

    function _tokenTransferIn(address from, uint256 amount) internal {
        IERC20(_TOKEN_).safeTransferFrom(from, address(this), amount);
    }

    function _tokenTransferOut(address to, uint256 amount) internal {
        IERC20(_TOKEN_).safeTransfer(to, amount);
    }
}
