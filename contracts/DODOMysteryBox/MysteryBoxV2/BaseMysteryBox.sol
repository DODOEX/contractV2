/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../../intf/IERC20.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {UniversalERC20} from "../../SmartRoute/lib/UniversalERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {Address} from "../../external/utils/Address.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {IRandomGenerator} from "../../lib/RandomGenerator.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {InitializableERC20} from "../../external/ERC20/InitializableERC20.sol";

interface IMysteryBoxPay {
    function getPayAmount(address mysteryBox, address user, uint256 originalPrice, uint256 ticketAmount) external view returns (uint256, uint256);
}

interface IMysteryBoxNft {
    function mint(address to, uint256 tokenId) external;
    function mint(address account, uint256 id, uint256 amount, bytes memory data) external;
}

contract BaseMysteryBox is InitializableERC20, InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address;
    using UniversalERC20 for IERC20;

    // ============ Storage ============
    address constant _BASE_COIN_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    address public _BUY_TOKEN_;
    uint256 public _BUY_RESERVE_;
    address public _FEE_MODEL_;
    address payable public _DEFAULT_MAINTAINER_;
    address public _NFT_TOKEN_;

    uint256 public _TICKET_UNIT_ = 1; // ticket consumed in a single lottery
    
    uint256 [] public _PRICE_TIME_INTERVAL_;
    uint256 [] public _PRICE_SET_;
    uint256 [] public _SELLING_AMOUNT_SET_;
    uint256 public _REDEEM_ALLOWED_TIME_;

    uint256[] public _BOX_INTERVAL_; // index => Interval probability (For ProbMode)  index => tokenId (For FixedAmount mode)
    uint256[][] public _TOKEN_ID_SET_; // Interval index => tokenIds (For ProbMode)
    
    bool public _IS_PROB_MODE; // false FixedAmount true ProbMode
    bool public _IS_REVEAL_MODE_;
    uint256 public _REVEAL_RNG_ = 0; 
    address public _RANDOM_GENERATOR_;

    fallback() external payable {}

    receive() external payable {}

    // ============ Modifiers ============

    modifier notStart() {
        require(block.timestamp < _PRICE_TIME_INTERVAL_[0] || _PRICE_TIME_INTERVAL_[0]  == 0, "ALREADY_START");
        _;
    }

    // ============ Event =============
    event BuyTicket(address account, uint256 payAmount, uint256 feeAmount, uint256 ticketAmount);
    event RedeemPrize(address account, uint256 tokenId, address referer);

    event ChangeRandomGenerator(address randomGenerator);
    event ChangeRedeemTime(uint256 redeemTime);
    event ChangeTicketUnit(uint256 newTicketUnit);
    event Withdraw(address account, uint256 amount);

    event SetPriceInterval();
    event SetBoxInterval();
    event SetTokenIds();
    event SetTokenIdByIndex(uint256 index);


    function init(
        address[] memory contractList, //0 owner, 1 buyToken, 2 feeModel, 3 defaultMaintainer 4 randomGenerator 5 nftToken
        uint256[][] memory priceList, //0 priceTimeInterval, 1 priceSet, 2 sellAmount
        uint256[] memory boxIntervals,
        uint256[][] memory tokenIds,
        uint256 redeemAllowedTime,
        bool isRevealMode,
        bool isProbMode,
        uint256 totalTickets
    ) public {
        initOwner(contractList[0]);
        _BUY_TOKEN_ = contractList[1];
        _FEE_MODEL_ = contractList[2];
        _DEFAULT_MAINTAINER_ = payable(contractList[3]);
        _RANDOM_GENERATOR_ = contractList[4];
        _NFT_TOKEN_ = contractList[5];

        _REDEEM_ALLOWED_TIME_ = redeemAllowedTime;
        if(priceList.length > 0) _setPrice(priceList[0], priceList[1], priceList[2]);
        
        _IS_REVEAL_MODE_ = isRevealMode;
        _IS_PROB_MODE = isProbMode;
        if(boxIntervals.length > 0) _setBoxInterval(boxIntervals);
        if(tokenIds.length > 0 && isProbMode) _setTokenIds(tokenIds);

        // init TICKET
        string memory prefix = "DROPS_";
        name = string(abi.encodePacked(prefix, addressToShortString(address(this))));
        symbol = name;
        decimals = 0;
        super.init(address(this), totalTickets, name, symbol, decimals);
    }

    function buyTickets(address assetTo, uint256 ticketAmount) payable external preventReentrant {
        (uint256 curPrice, uint256 sellAmount, uint256 index) = getPriceAndSellAmount();
        require(curPrice > 0 && sellAmount > 0, "CAN_NOT_BUY");
        require(ticketAmount <= sellAmount, "TICKETS_NOT_ENOUGH");
        (uint256 payAmount, uint256 feeAmount) = IMysteryBoxPay(_FEE_MODEL_).getPayAmount(address(this), assetTo, curPrice, ticketAmount);
        require(payAmount > 0, "UnQualified");

        uint256 baseBalance = IERC20(_BUY_TOKEN_).universalBalanceOf(address(this));
        uint256 buyInput = baseBalance.sub(_BUY_RESERVE_);

        require(payAmount <= buyInput, "PAY_AMOUNT_NOT_ENOUGH");

        _SELLING_AMOUNT_SET_[index] = sellAmount.sub(ticketAmount);
        _BUY_RESERVE_ = baseBalance.sub(feeAmount);

        IERC20(_BUY_TOKEN_).universalTransfer(_DEFAULT_MAINTAINER_,feeAmount);
        _transfer(address(this), assetTo, ticketAmount);
        emit BuyTicket(assetTo, payAmount, feeAmount, ticketAmount);
    }

    function redeemTicket(uint256 ticketNum, address referer) external {
        require(!address(msg.sender).isContract(), "ONLY_ALLOW_EOA");
        require(ticketNum >= 1 && ticketNum <= balanceOf(msg.sender), "TICKET_NUM_INVALID");
        balances[msg.sender] = balances[msg.sender].sub(ticketNum);
        balances[address(0)] = balances[address(0)].add(ticketNum);

        emit Transfer(msg.sender, address(0), ticketNum);

        for (uint256 i = 0; i < ticketNum; i++) {
            _redeemSinglePrize(msg.sender, i, referer);
        }
    }

    // ============ Internal  ============

    function _redeemSinglePrize(address to, uint256 curNo, address referer) internal {
        require(block.timestamp >= _REDEEM_ALLOWED_TIME_ && _REDEEM_ALLOWED_TIME_ != 0, "REDEEM_CLOSE");
        uint256 range;
        if(_IS_PROB_MODE) {
            range = _BOX_INTERVAL_[_BOX_INTERVAL_.length - 1];
        }else {
            range = _BOX_INTERVAL_.length;
        }
        uint256 random;
        if(_IS_REVEAL_MODE_) {
            require(_REVEAL_RNG_ != 0, "REVEAL_NOT_SET");
            random = uint256(keccak256(abi.encodePacked(_REVEAL_RNG_, msg.sender, balanceOf(msg.sender).add(curNo + 1)))) % range;
        }else {
            random = IRandomGenerator(_RANDOM_GENERATOR_).random(gasleft() + block.number) % range; 
        }
        uint256 tokenId;
        if(_IS_PROB_MODE) {
            uint256 i;
            for (i = 0; i < _BOX_INTERVAL_.length; i++) {
                if (random <= _BOX_INTERVAL_[i]) {
                    break;
                }
            }
            require(_TOKEN_ID_SET_[i].length > 0, "EMPTY_TOKEN_ID_SET");
            tokenId = _TOKEN_ID_SET_[i][random % _TOKEN_ID_SET_[i].length];
            IMysteryBoxNft(_NFT_TOKEN_).mint(to, tokenId, 1, "");
        } else {
            tokenId = _BOX_INTERVAL_[random];
            if(random != range - 1) {
                _BOX_INTERVAL_[random] = _BOX_INTERVAL_[range - 1];
            }
            _BOX_INTERVAL_.pop();
            IMysteryBoxNft(_NFT_TOKEN_).mint(to, tokenId);  
        }
        emit RedeemPrize(to, tokenId, referer);
    }


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

    function _setBoxInterval(uint256[] memory boxIntervals) internal {
        require(boxIntervals.length > 0, "PARAM_NOT_INVALID");
        if(_IS_PROB_MODE) {
            for (uint256 i = 1; i < boxIntervals.length; i++) {
                require(boxIntervals[i] > boxIntervals[i - 1], "INTERVAL_INVALID");
            }
        }
        _BOX_INTERVAL_ = boxIntervals;
        emit SetBoxInterval();
    }

    function _setTokenIds(uint256[][] memory tokenIds) internal {
        require(tokenIds.length == _BOX_INTERVAL_.length, "PARAM_NOT_INVALID");
        require(_IS_PROB_MODE, "ONLY_ALLOW_PROB_MODE");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenIds[i].length > 0, "INVALID");
        }
        _TOKEN_ID_SET_ = tokenIds;
        emit SetTokenIds();
    }

    // ================= Owner ===================

    function withdraw() external onlyOwner {
        uint256 amount = IERC20(_BUY_TOKEN_).universalBalanceOf(address(this));
        IERC20(_BUY_TOKEN_).universalTransfer(msg.sender ,amount);
        emit Withdraw(msg.sender, amount);
    }
    
    function redeemByOwner(uint256 ticketNum, address referer) external onlyOwner {
        require(ticketNum >= 1 && ticketNum <= balanceOf(address(this)), "TICKET_NUM_INVALID");
        balances[address(this)] = balances[address(this)].sub(ticketNum);
        balances[address(0)] = balances[address(0)].add(ticketNum);

        emit Transfer(address(this), address(0), ticketNum);
        
        for (uint256 i = 0; i < ticketNum; i++) {
            _redeemSinglePrize(msg.sender, i, referer);
        }
    }

    function setRevealRng() external onlyOwner {
        require(_REVEAL_RNG_ == 0, "ALREADY_SET");
        _REVEAL_RNG_ = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1))));
    }
    
    function setPrice(uint256[] memory priceIntervals, uint256[] memory prices, uint256[] memory amounts) external notStart() onlyOwner {
        _setPrice(priceIntervals, prices, amounts);
    }

    function setBoxInterval(uint256[] memory boxIntervals) external notStart() onlyOwner {
        _setBoxInterval(boxIntervals);
    }

    function setTokenIds(uint256[][] memory tokenIds) external notStart() onlyOwner {
        _setTokenIds(tokenIds);
    }

    function setTokenIdByIndex(uint256 index, uint256[] memory tokenIds) external notStart() onlyOwner {
        require(tokenIds.length > 0 && index < _TOKEN_ID_SET_.length,"PARAM_NOT_INVALID");
        require(_IS_PROB_MODE, "ONLY_ALLOW_PROB_MODE");
        _TOKEN_ID_SET_[index] = tokenIds;
        emit SetTokenIdByIndex(index);
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

    // ================= View ===================

    function getPriceAndSellAmount() public view returns (uint256 curPrice, uint256 sellAmount, uint256 index) {
        uint256 curBlockTime = block.timestamp;
        if(curBlockTime >= _PRICE_TIME_INTERVAL_[0] && _PRICE_TIME_INTERVAL_[0] != 0) {
            uint256 i;
            for (i = 1; i < _PRICE_TIME_INTERVAL_.length; i++) {
                if (curBlockTime <= _PRICE_TIME_INTERVAL_[i]) {
                    break;
                }
            }
            sellAmount = _SELLING_AMOUNT_SET_[i-1];
            curPrice = _PRICE_SET_[i-1];
            index = i - 1;
        }
    }

    function addressToShortString(address _addr) public pure returns (string memory) {
        bytes32 value = bytes32(uint256(_addr));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(8);
        for (uint256 i = 0; i < 4; i++) {
            str[i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[1 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
