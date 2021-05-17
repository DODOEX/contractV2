/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {Address} from "../external/utils/Address.sol";
import {IRandomGenerator} from "../lib/RandomGenerator.sol";
import {ERC1155} from "../external/ERC1155/ERC1155.sol";
import {BaseMysteryBox} from "./BaseMysteryBox.sol";

//讨论：tokenId 与 ipfs 的 uri 关联关系
contract MysteryBoxV2 is BaseMysteryBox, ERC1155 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    // ============ Storage ============

    uint256[] public _PROB_INTERVAL_; // index => Interval probability
    uint256[][] public _TOKEN_ID_SET_; // Interval index => tokenIds
    
    // ============ Event =============
    event RedeemPrize(address account, uint256 tokenId);
    
    event SetProbInterval();
    event SetTokenIds();
    event SetTokenIdByIndex(uint256 index);


    function init(
        address[] memory contractList, //0 owner, 1 buyTicketToken, 2 feeModel, 3 dodoApproveProxy 4 randomGenerator
        uint256[][] memory priceList, //0 priceTimeInterval, 1 priceSet, 2 sellAmount
        uint256 redeemAllowedTime,
        bool isRevealMode,
        string memory baseUri,
        uint256[] memory probIntervals,
        uint256[][] memory tokenIds
    ) public {
        super._baseInit(contractList,priceList,redeemAllowedTime,isRevealMode);
        _setURI(baseUri);
        if(probIntervals.length > 0) _setProbInterval(probIntervals);
        if(tokenIds.length > 0) _setTokenIds(tokenIds);
    }

    function redeemTicket(uint256 ticketNum) external {
        require(!address(msg.sender).isContract(), "ONLY_ALLOW_EOA");
        require(ticketNum >= 1 && ticketNum <= _USER_TICKETS_[msg.sender], "TICKET_NUM_INVALID");
        _USER_TICKETS_[msg.sender] = _USER_TICKETS_[msg.sender].sub(ticketNum);
        _TOTAL_TICKETS_ = _TOTAL_TICKETS_.sub(ticketNum);
        for (uint256 i = 0; i < ticketNum; i++) {
            _redeemSinglePrize(msg.sender, i);
        }
    }

    // ============ Internal  ============

    function _redeemSinglePrize(address to, uint256 curNo) internal {
        require(block.timestamp >= _REDEEM_ALLOWED_TIME_ && _REDEEM_ALLOWED_TIME_ != 0, "REDEEM_CLOSE");
        uint256 range = _PROB_INTERVAL_[_PROB_INTERVAL_.length - 1];
        uint256 random;
        if(_IS_REVEAL_MODE_) {
            require(_REVEAL_RNG_ != 0, "REVEAL_NOT_SET");
            random = uint256(keccak256(abi.encodePacked(_REVEAL_RNG_, msg.sender, _USER_TICKETS_[msg.sender].add(curNo + 1)))) % range;
        }else {
            random = IRandomGenerator(_RANDOM_GENERATOR_).random(gasleft()) % range; 
        }
        uint256 i;
        for (i = 0; i < _PROB_INTERVAL_.length; i++) {
            if (random <= _PROB_INTERVAL_[i]) {
                break;
            }
        }
        require(_TOKEN_ID_SET_[i].length > 0, "EMPTY_TOKEN_ID_SET");
        uint256 tokenId = _TOKEN_ID_SET_[i][random % _TOKEN_ID_SET_[i].length];
        _mint(to, tokenId, 1, "");
        emit RedeemPrize(to, tokenId);
    }

    function _setProbInterval(uint256[] memory probIntervals) internal {
        require(probIntervals.length > 0, "PARAM_NOT_INVALID");
        for (uint256 i = 1; i < probIntervals.length; i++) {
            require(probIntervals[i] > probIntervals[i - 1], "INTERVAL_INVALID");
        }
        _PROB_INTERVAL_ = probIntervals;
        emit SetProbInterval();
    }

    function _setTokenIds(uint256[][] memory tokenIds) internal {
        require(tokenIds.length == _PROB_INTERVAL_.length, "PARAM_NOT_INVALID");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenIds[i].length > 0, "INVALID");
        }
        _TOKEN_ID_SET_ = tokenIds;
        emit SetTokenIds();
    }

    // ================= Owner ===================
    function redeemByOwner(uint256 ticketNum) external onlyOwner {
        for (uint256 i = 0; i < ticketNum; i++) {
            _redeemSinglePrize(msg.sender, i);
        }
    }

    function setProbInterval(uint256[] memory probIntervals) external notStart() onlyOwner {
        _setProbInterval(probIntervals);
    }

    function setTokenIds(uint256[][] memory tokenIds) external notStart() onlyOwner {
        _setTokenIds(tokenIds);
    }

    function setTokenIdByIndex(uint256 index, uint256[] memory tokenIds) external notStart() onlyOwner {
        require(tokenIds.length > 0 && index < _TOKEN_ID_SET_.length,"PARAM_NOT_INVALID");
        _TOKEN_ID_SET_[index] = tokenIds;
        emit SetTokenIdByIndex(index);
    }
}
