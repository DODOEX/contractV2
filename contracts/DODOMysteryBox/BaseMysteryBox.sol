/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {IDODOApproveProxy} from "../SmartRoute/DODOApproveProxy.sol";

interface IPrice {
    function getUserPrice(address mysteryBox, address user, uint256 originalPrice) external view returns (uint256);
}


contract BaseMysteryBox is InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============
    address constant _BASE_COIN_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public _BUY_TICKET_TOKEN_;
    address public _FEE_MODEL_;
    address public _DODO_APPROVE_PROXY_;
    uint256 [] public _PRICE_TIME_INTERVAL_;
    uint256 [] public _PRICE_SET_;
    uint256 [] public _SELLING_AMOUNT_SET_;
    
    uint256 public _REDEEM_ALLOWED_TIME_;

    mapping(address => uint256) public _USER_TICKETS_;
    uint256 public _TOTAL_TICKETS_;
    uint256 public _TICKET_UNIT_ = 1; // ticket consumed in a single lottery

    bool public _IS_REVEAL_MODE_;
    uint256 public _REVEAL_RNG_ = 0; 
    address public _RANDOM_GENERATOR_;

    
    // ============ Modifiers ============

    modifier notStart() {
        require(block.timestamp < _PRICE_TIME_INTERVAL_[0] || _PRICE_TIME_INTERVAL_[0]  == 0, "ALREADY_START");
        _;
    }

    // ============ Event =============
    event BuyTicket(address account, uint256 value, uint256 tickets);
    event Withdraw(address account, uint256 amount);
    event ChangeRandomGenerator(address randomGenerator);
    event ChangeRedeemTime(uint256 redeemTime);
    event ChangeTicketUnit(uint256 newTicketUnit);
    event SetPriceInterval();
    event Transfer(address indexed from, address indexed to, uint256 amount);


    function _baseInit(
        address[] memory contractList, //0 owner, 1 buyTicketToken, 2 feeModel, 3 dodoApproveProxy 4 randomGenerator
        uint256[][] memory priceList, //0 priceTimeInterval, 1 priceSet, 2 sellAmount
        uint256 redeemAllowedTime,
        bool isRevealMode
    ) public {
        initOwner(contractList[0]);
        _BUY_TICKET_TOKEN_ = contractList[1];
        _FEE_MODEL_ = contractList[2];
        _DODO_APPROVE_PROXY_ = contractList[3];
        _RANDOM_GENERATOR_ = contractList[4];

        _REDEEM_ALLOWED_TIME_ = redeemAllowedTime;
        _IS_REVEAL_MODE_ = isRevealMode;
        if(priceList[0].length > 0) _setPrice(priceList[0], priceList[1], priceList[2]);
    }

    function buyTickets(uint256 amount) payable external {
        uint256 curBlockTime = block.timestamp;
        require(curBlockTime >= _PRICE_TIME_INTERVAL_[0] && _PRICE_TIME_INTERVAL_[0] != 0, "NOT_START");
        uint256 i;
        for (i = 1; i < _PRICE_TIME_INTERVAL_.length; i++) {
            if (curBlockTime <= _PRICE_TIME_INTERVAL_[i]) {
                break;
            }
        }
        uint256 curSellAmount = _SELLING_AMOUNT_SET_[i-1];
        require(amount <= curSellAmount, "TICKETS_NOT_ENOUGH");
        uint256 buyPrice = IPrice(_FEE_MODEL_).getUserPrice(address(this), msg.sender, _PRICE_SET_[i-1]);
        require(buyPrice > 0, "UnQualified");
        uint256 payAmount = buyPrice.mul(amount);
        if(_BUY_TICKET_TOKEN_ == _BASE_COIN_) {
            require(msg.value >= payAmount,"BUY_TOKEN_NOT_ENOUGH");
        }else {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(_BUY_TICKET_TOKEN_, msg.sender, address(this), payAmount);
        }

        _USER_TICKETS_[msg.sender] = _USER_TICKETS_[msg.sender].add(amount);
        _TOTAL_TICKETS_ = _TOTAL_TICKETS_.add(amount);
        _SELLING_AMOUNT_SET_[i - 1] = curSellAmount.sub(amount);

        uint256 leftOver = msg.value - payAmount;
        if(leftOver > 0) 
            msg.sender.transfer(leftOver);

        emit BuyTicket(msg.sender, payAmount, amount);
    }


    function transferTickets(address to, uint256 amount) public returns (bool) {
        require(amount <= _USER_TICKETS_[msg.sender], "TICKET_NOT_ENOUGH");

        _USER_TICKETS_[msg.sender] = _USER_TICKETS_[msg.sender].sub(amount);
        _USER_TICKETS_[to] = _USER_TICKETS_[to].add(amount);
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    // ================= View ===================
    function getTickets(address account) view external returns(uint256) {
        return _USER_TICKETS_[account];
    }

    // ============ Internal  ============

    function _setPrice(uint256[] memory priceIntervals, uint256[] memory prices, uint256[] memory amounts) internal {
        require(priceIntervals.length == prices.length && prices.length == amounts.length, "PARAM_NOT_INVALID");
        for (uint256 i = 0; i < priceIntervals.length - 1; i++) {
            require(priceIntervals[i] < priceIntervals[i + 1], "INTERVAL_INVALID");
            require(prices[i] != 0, "INTERVAL_INVALID");
            require(amounts[i] != 0, "INTERVAL_INVALID");
        }
        _PRICE_TIME_INTERVAL_ = priceIntervals;
        _PRICE_SET_ = prices;
        _SELLING_AMOUNT_SET_ = amounts;
        emit SetPriceInterval();
    }

    // ================= Owner ===================
    function withdraw() external onlyOwner {
        uint256 amount;
        if(_BASE_COIN_ == _BUY_TICKET_TOKEN_) {
            amount = address(this).balance;
            msg.sender.transfer(amount);
        }else {
            amount = IERC20(_BUY_TICKET_TOKEN_).balanceOf(address(this));
            IERC20(_BUY_TICKET_TOKEN_).safeTransfer(msg.sender, amount);
        }
        emit Withdraw(msg.sender, amount);
    }

    function setRevealRng() external onlyOwner {
        require(_REVEAL_RNG_ == 0, "ALREADY_SET");
        _REVEAL_RNG_ = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1))));
    }
    
    function setPrice(uint256[] memory priceIntervals, uint256[] memory prices, uint256[] memory amounts) external notStart() onlyOwner {
        _setPrice(priceIntervals, prices, amounts);
    }

    function updateRandomGenerator(address newRandomGenerator) external onlyOwner {
        require(newRandomGenerator != address(0));
        _RANDOM_GENERATOR_ = newRandomGenerator;
        emit ChangeRandomGenerator(newRandomGenerator);
    }

    function updateTicketUnit(uint256 newTicketUnit) external onlyOwner {
        require(newTicketUnit != 0);
        _TICKET_UNIT_ = newTicketUnit;
        emit ChangeTicketUnit(newTicketUnit);
    }

    function updateRedeemTime(uint256 newRedeemTime) external onlyOwner {
        require(newRedeemTime > block.timestamp || newRedeemTime == 0, "PARAM_NOT_INVALID");
        _REDEEM_ALLOWED_TIME_ = newRedeemTime;
        emit ChangeRedeemTime(newRedeemTime);
    }
}
