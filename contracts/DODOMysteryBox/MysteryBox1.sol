/*
    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {IRandomGenerator} from "../lib/RandomGenerator.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {Address} from "../external/utils/Address.sol";
import {ERC721} from "../external/ERC721/ERC721.sol";

contract MysteryBox1 is ERC721, InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    // ============ Storage ============

    mapping(address => uint256) _USER_TICKETS_;

    uint256 public _TOTAL_TICKETS_;
    uint256 public _CUR_SELLING_TICKETS_;
    uint256 public _CUR_PRCIE_;
    uint256 public _TICKET_UNIT_ = 1; // ticket consumed in a single lottery

    
    mapping(uint256 => bool) _TOKEN_ID_FLAG_;

    address public _RANDOM_GENERATOR_;

    uint256 constant _TOTAL_NFTs_ = 3000;

    // ============ Event =============
    event ChangeRandomGenerator(address randomGenerator);
    event ChangeTicketUnit(uint256 newTicketUnit);
    event ChangeSellingInfo(uint256 curSellingTickets, uint256 curPrice);
    event Withdraw(address account, uint256 amount);

    fallback() external payable {}

    receive() external payable {}

    function init(
        address owner,
        string memory baseUri,
        address randomGenerator
    ) public {
        initOwner(owner);
        _setURI(baseUri);
        _RANDOM_GENERATOR_ = randomGenerator;
    }

    function buyTicket() payable external {
        require(msg.value >= _CUR_PRCIE_, "BNB_NOT_ENOUGH");

    }

    function redeemPrize(address to) external {

        // uint256 ticketNum = ticketInput.div(_TICKET_UNIT_);
        // require(ticketNum >= 1, "DODOMysteryBox: TICKET_NOT_ENOUGH");
        // for (uint256 i = 0; i < ticketNum; i++) {
        //     _redeemSinglePrize(to);
        // }
        // emit RedeemPrize(to, ticketInput, ticketNum);
    }

    // =============== View ================

    // =============== Internal  ================

    function _redeemSinglePrize(address to) internal {
        // uint256 range = _PROB_INTERVAL_[_PROB_INTERVAL_.length - 1];
        // uint256 random = IRandomGenerator(_RANDOM_GENERATOR_).random(gasleft()) % range;
        // uint256 i;
        // for (i = 0; i < _PROB_INTERVAL_.length; i++) {
        //     if (random <= _PROB_INTERVAL_[i]) {
        //         break;
        //     }
        // }
        // require(_PRIZE_SET_[i].length > 0, "EMPTY_PRIZE_SET");
        // uint256 prize = _PRIZE_SET_[i][random % _PRIZE_SET_[i].length];
        // _mint(to, prize, 1, "");
    }

    // ================= Owner ===================

    function updateRandomGenerator(address newRandomGenerator) external onlyOwner {
        require(newRandomGenerator != address(0));
        _RANDOM_GENERATOR_ = newRandomGenerator;
        emit ChangeRandomGenerator(newRandomGenerator);
    }

    function updateSellingInfo(uint256 newSellingTickets, uint256 newPrice) external onlyOwner {
        _CUR_SELLING_TICKETS_ = newSellingTickets;
        _CUR_PRCIE_ = newPrice;
        emit ChangeSellingInfo(newSellingTickets, newPrice);
    }

    function updateTicketUnit(uint256 newTicketUnit) external onlyOwner {
        require(newTicketUnit != 0);
        _TICKET_UNIT_ = newTicketUnit;
        emit ChangeTicketUnit(newTicketUnit);
    }

    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        msg.sender.transfer(amount);
        emit Withdraw(msg.sender, amount);
    }
}
