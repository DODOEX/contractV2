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
import {ERC1155} from "../external/ERC1155/ERC1155.sol";

contract DODOMysteryBox is ERC1155, InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============

    address public _TICKET_;
    uint256 public _TICKET_RESERVE_;
    uint256 public _TICKET_UNIT_; // ticket consumed in a single lottery

    address public _RANDOM_GENERATOR_;
    address public _DODO_MYSTERY_BOX_PROXY_;
    uint256[] public _PROB_INTERVAL_; // index => Interval probability
    uint256[][] public _PRIZE_SET_; // Interval index => tokenIds
    mapping(uint256 => bool) _TOKEN_ID_FLAG_;

    // ============ Event =============
    event ChangeRandomGenerator(address randomGenerator);
    event ChangeTicketUnit(uint256 newTicketUnit);
    event ChangeMysteryBoxProxy(address mysteryBoxProxy);
    event RetriveTicket(address to, uint256 amount);
    event BurnTicket(uint256 amount);
    event RedeemPrize(address to, uint256 ticketInput, uint256 ticketNum);
    event SetProbInterval();
    event SetPrizeSet();
    event SetPrizeSetByIndex(uint256 index);

    function init(
        address owner,
        string memory baseUri,
        address randomGenerator,
        address dodoMysteryBoxProxy,
        address ticket,
        uint256 ticketUnit,
        uint256[] memory probIntervals,
        uint256[][] memory prizeSet
    ) public {
        require(
            probIntervals.length == prizeSet.length && probIntervals.length > 0,
            "DODOMysteryBox: PARAM_NOT_INVALID"
        );
        initOwner(owner);
        _setURI(baseUri);

        _RANDOM_GENERATOR_ = randomGenerator;
        _DODO_MYSTERY_BOX_PROXY_ = dodoMysteryBoxProxy;
        _TICKET_ = ticket;
        _TICKET_UNIT_ = ticketUnit;

        _setProbInterval(probIntervals);
        _setPrizeSet(prizeSet);
    }

    function redeemPrize(address to) external {
        require(msg.sender == _DODO_MYSTERY_BOX_PROXY_, "DODOMysteryBox: ACCESS_DENIED");
        uint256 ticketBalance = IERC20(_TICKET_).balanceOf(address(this));
        uint256 ticketInput = ticketBalance.sub(_TICKET_RESERVE_);
        uint256 ticketNum = ticketInput.div(_TICKET_UNIT_);
        require(ticketNum >= 1, "DODOMysteryBox: TICKET_NOT_ENOUGH");
        for (uint256 i = 0; i < ticketNum; i++) {
            _redeemSinglePrize(to);
        }
        _TICKET_RESERVE_ = _TICKET_RESERVE_.add(ticketInput);
        emit RedeemPrize(to, ticketInput, ticketNum);
    }

    // =============== View ================
    function getRarityByTokenId(uint256 tokenId) external view returns (uint256) {
        require(_TOKEN_ID_FLAG_[tokenId], "DODOMysteryBox: TOKEN_ID_NOT_FOUND");
        for (uint256 i = 0; i < _PRIZE_SET_.length; i++) {
            uint256[] memory curPrizes = _PRIZE_SET_[i];
            for (uint256 j = 0; j < curPrizes.length; j++) {
                if(tokenId == curPrizes[j]) {
                    return i;
                }
            }
        }
    }

    // ============ Internal  ============

    function _redeemSinglePrize(address to) internal {
        uint256 range = _PROB_INTERVAL_[_PROB_INTERVAL_.length - 1];
        uint256 random = IRandomGenerator(_RANDOM_GENERATOR_).random(gasleft()) % range;
        uint256 i;
        for (i = 0; i < _PROB_INTERVAL_.length; i++) {
            if (random <= _PROB_INTERVAL_[i]) {
                break;
            }
        }
        require(_PRIZE_SET_[i].length > 0, "EMPTY_PRIZE_SET");
        uint256 prize = _PRIZE_SET_[i][random % _PRIZE_SET_[i].length];
        _mint(to, prize, 1, "");
    }

    function _setProbInterval(uint256[] memory probIntervals) internal {
        for (uint256 i = 1; i < probIntervals.length; i++) {
            require(probIntervals[i] > probIntervals[i - 1], "DODOMysteryBox: INTERVAL_INVALID");
        }
        _PROB_INTERVAL_ = probIntervals;
        emit SetProbInterval();
    }

    function _setPrizeSet(uint256[][] memory prizeSet) internal {
        for (uint256 i = 0; i < prizeSet.length; i++) {
            uint256[] memory curPrizes = prizeSet[i];
            require(curPrizes.length > 0, "DODOMysteryBox: PRIZES_INVALID");
            for (uint256 j = 0; j < curPrizes.length; j++) {
                uint256 curTokenId = prizeSet[i][j];
                if (_TOKEN_ID_FLAG_[curTokenId]) {
                    require(false, "DODOMysteryBox: TOKEN_ID_INVALID");
                } else {
                    _TOKEN_ID_FLAG_[curTokenId] = true;
                }
            }
        }
        _PRIZE_SET_ = prizeSet;
        emit SetPrizeSet();
    }

    // ================= Owner ===================

    function setProbInterval(uint256[] memory probIntervals) external onlyOwner {
        require(probIntervals.length > 0, "DODOMysteryBox: PARAM_NOT_INVALID");
        _setProbInterval(probIntervals);
    }

    function setPrzieSet(uint256[][] memory prizeSet) external onlyOwner {
        require(prizeSet.length == _PROB_INTERVAL_.length, "DODOMysteryBox: PARAM_NOT_INVALID");
        _setPrizeSet(prizeSet);
    }

    function setPrizeSetByIndex(uint256 index, uint256[] memory prizes) external onlyOwner {
        require(
            prizes.length > 0 && index < _PRIZE_SET_.length,
            "DODOMysteryBox: PARAM_NOT_INVALID"
        );
        for (uint256 i = 0; i < prizes.length; i++) {
            if (_TOKEN_ID_FLAG_[prizes[i]]) {
                require(false, "DODOMysteryBox: TOKEN_ID_INVALID");
            } else {
                _TOKEN_ID_FLAG_[prizes[i]] = true;
            }
        }
        _PRIZE_SET_[index] = prizes;
        emit SetPrizeSetByIndex(index);
    }

    function updateRandomGenerator(address newRandomGenerator) external onlyOwner {
        require(newRandomGenerator != address(0));
        _RANDOM_GENERATOR_ = newRandomGenerator;
        emit ChangeRandomGenerator(newRandomGenerator);
    }

    function updateMysteryBoxProxy(address newMysteryBoxProxy) external onlyOwner {
        require(newMysteryBoxProxy != address(0));
        _DODO_MYSTERY_BOX_PROXY_ = newMysteryBoxProxy;
        emit ChangeMysteryBoxProxy(newMysteryBoxProxy);
    }

    function updateTicketUnit(uint256 newTicketUnit) external onlyOwner {
        require(newTicketUnit != 0);
        _TICKET_UNIT_ = newTicketUnit;
        emit ChangeTicketUnit(newTicketUnit);
    }

    function retriveTicket(uint256 amount) external onlyOwner {
        _TICKET_RESERVE_ = _TICKET_RESERVE_.sub(amount);
        IERC20(_TICKET_).safeTransfer(_OWNER_, amount);
        emit RetriveTicket(_OWNER_, amount);
    }

    function burnTicket(uint256 amount) external onlyOwner {
        _TICKET_RESERVE_ = _TICKET_RESERVE_.sub(amount);
        IERC20(_TICKET_).safeTransfer(address(0), amount);
        emit BurnTicket(amount);
    }
}
