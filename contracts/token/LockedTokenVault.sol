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
    mapping(address => uint256) internal remainingBalances;

    mapping(address => bool) internal confirmOriginBalance;
    mapping(address => address) internal holderTransferRequest;

    uint256 public _START_RELEASE_TIME_;
    uint256 public _RELEASE_DURATION_;
    uint256 public _CLIFF_RATE_;

    // ============ Modifiers ============

    modifier beforeStartRelease() {
        require(block.timestamp < _START_RELEASE_TIME_, "RELEASE START");
        _;
    }

    modifier afterStartRelease() {
        require(block.timestamp > _START_RELEASE_TIME_, "RELEASE NOT START");
        _;
    }

    modifier holderConfirmed(address holder) {
        require(confirmOriginBalance[holder], "HOLDER NOT CONFIRMED");
        _;
    }

    modifier holderNotConfirmed(address holder) {
        require(!confirmOriginBalance[holder], "HOLDER CONFIRMED");
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

    function deposit(uint256 amount) external onlyOwner beforeStartRelease {
        _tokenTransferIn(_OWNER_, amount);
        originBalances[_OWNER_] = originBalances[_OWNER_].add(amount);
        remainingBalances[_OWNER_] = remainingBalances[_OWNER_].add(amount);
    }

    function withdraw(uint256 amount) external onlyOwner beforeStartRelease {
        originBalances[_OWNER_] = originBalances[_OWNER_].sub(amount);
        remainingBalances[_OWNER_] = remainingBalances[_OWNER_].sub(amount);
        _tokenTransferOut(_OWNER_, amount);
    }

    // ============ For Owner ============

    function grant(address holder, uint256 amount)
        external
        onlyOwner
        beforeStartRelease
        holderNotConfirmed(holder)
    {
        originBalances[holder] = originBalances[holder].add(amount);
        remainingBalances[holder] = remainingBalances[holder].add(amount);

        originBalances[_OWNER_] = originBalances[_OWNER_].sub(amount);
        remainingBalances[_OWNER_] = remainingBalances[_OWNER_].sub(amount);
    }

    function recall(address holder)
        external
        onlyOwner
        beforeStartRelease
        holderNotConfirmed(holder)
    {
        uint256 amount = originBalances[holder];

        originBalances[holder] = 0;
        remainingBalances[holder] = 0;

        originBalances[_OWNER_] = originBalances[_OWNER_].add(amount);
        remainingBalances[_OWNER_] = remainingBalances[_OWNER_].add(amount);
    }

    function executeHolderTransfer(address holder) external onlyOwner {
        address newHolder = holderTransferRequest[holder];
        require(newHolder != address(0), "INVALID NEW HOLDER");
        require(originBalances[newHolder] == 0, "NOT NEW HOLDER");

        originBalances[newHolder] = originBalances[holder];
        remainingBalances[newHolder] = remainingBalances[holder];

        originBalances[holder] = 0;
        remainingBalances[holder] = 0;

        holderTransferRequest[holder] = address(0);
    }

    // ============ For Holder ============

    function confirm() external {
        confirmOriginBalance[msg.sender] = true;
    }

    function cancelConfirm() external {
        confirmOriginBalance[msg.sender] = false;
    }

    function requestTransfer(address newHolder) external holderConfirmed(msg.sender) {
        require(originBalances[newHolder] == 0, "NOT NEW HOLDER");
        holderTransferRequest[msg.sender] = newHolder;
    }

    function claimToken() external afterStartRelease {
        uint256 unLocked = getUnlockedBalance(msg.sender);

        _tokenTransferOut(msg.sender, unLocked);
        remainingBalances[msg.sender] = remainingBalances[msg.sender].sub(unLocked);
    }

    // ============ View ============

    function getOriginBalance(address holder) external view returns (uint256) {
        return originBalances[holder];
    }

    function getRemainingBalance(address holder) external view returns (uint256) {
        return remainingBalances[holder];
    }

    function isConfirmed(address holder) external view returns (bool) {
        return confirmOriginBalance[holder];
    }

    function getHolderTransferRequest(address holder) external view returns (address) {
        return holderTransferRequest[holder];
    }

    function getUnlockedBalance(address holder) public view returns (uint256) {
        if (block.timestamp < _START_RELEASE_TIME_) {
            return 0;
        }
        uint256 newRemaining = 0;
        uint256 timePast = block.timestamp.sub(_START_RELEASE_TIME_);
        if (timePast < _RELEASE_DURATION_) {
            uint256 remainingTime = _RELEASE_DURATION_.sub(timePast);
            newRemaining = originBalances[holder]
                .sub(DecimalMath.mul(originBalances[holder], _CLIFF_RATE_))
                .mul(remainingTime)
                .div(_RELEASE_DURATION_);
        }
        return remainingBalances[msg.sender].sub(newRemaining);
    }

    // ============ Internal Helper ============

    function _tokenTransferIn(address from, uint256 amount) internal {
        IERC20(_TOKEN_).safeTransferFrom(from, address(this), amount);
    }

    function _tokenTransferOut(address to, uint256 amount) internal {
        IERC20(_TOKEN_).safeTransfer(to, amount);
    }
}
