/*
    Copyright 2021 DODO ZOO.
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
import {BaseMysteryBox} from "./BaseMysteryBox.sol";

contract MysteryBoxV3 is BaseMysteryBox, ERC721 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    // ============ Storage ============
    uint256[] public _TOKEN_IDS_;

    // ============ Event =============
    event RedeemPrize(address account, uint256 tokenId);
    event SetTokenIds();

    function init(
        address[] memory contractList, //0 owner, 1 buyTicketToken, 2 feeModel, 3 dodoApproveProxy 4 randomGenerator
        uint256[][] memory priceList, //0 priceTimeInterval, 1 priceSet, 2 sellAmount
        uint256 redeemAllowedTime,
        bool isRevealMode,
        string memory name,
        string memory symbol,
        string memory baseUri,
        uint256[] memory tokenIds
    ) public {
        super._baseInit(contractList,priceList,redeemAllowedTime,isRevealMode);
        _name = name;
        _symbol = symbol;
        _baseUri = baseUri;
        if(tokenIds.length > 0) _setTokenIds(tokenIds);
    }

    function redeemPrize(uint256 ticketNum) external {
        require(!address(msg.sender).isContract(), "ONLY_ALLOW_EOA");
        require(ticketNum >= 1 && ticketNum <= _USER_TICKETS_[msg.sender], "TICKET_NUM_INVALID");
        _USER_TICKETS_[msg.sender] = _USER_TICKETS_[msg.sender].sub(ticketNum);
        _TOTAL_TICKETS_ = _TOTAL_TICKETS_.sub(ticketNum);
        for (uint256 i = 0; i < ticketNum; i++) {
            _redeemSinglePrize(msg.sender, i);
        }
    }

    // =============== Internal  ================
    function _redeemSinglePrize(address to, uint256 curNo) internal {
        require(block.timestamp >= _REDEEM_ALLOWED_TIME_ && _REDEEM_ALLOWED_TIME_ != 0, "REDEEM_CLOSE");
        uint256 range = _TOKEN_IDS_.length;
        uint256 random;
        if(_IS_REVEAL_MODE_) {
            require(_REVEAL_RNG_ != 0, "REVEAL_NOT_SET");
            random = uint256(keccak256(abi.encodePacked(_REVEAL_RNG_, msg.sender, _USER_TICKETS_[msg.sender].add(curNo + 1)))) % range;
        }else {
            random = IRandomGenerator(_RANDOM_GENERATOR_).random(gasleft()) % range; 
        }
        uint256 tokenId = _TOKEN_IDS_[random];

        if(random != range - 1) {
            _TOKEN_IDS_[random] = _TOKEN_IDS_[range - 1];
        }
        _TOKEN_IDS_.pop();
        _mint(to, tokenId);
        emit RedeemPrize(to, tokenId);
    }

    function _setTokenIds(uint256[] memory ids) internal {
        require(ids.length > 0, "PARAM_NOT_INVALID");
        _TOKEN_IDS_ = ids;
    }

    // ================= Owner ===================
    function redeemByOwner(uint256 ticketNum) external onlyOwner {
        for (uint256 i = 0; i < ticketNum; i++) {
            _redeemSinglePrize(msg.sender, i);
        }
    }

    function setTokenIds(uint256[] memory ids) external notStart() onlyOwner {
        _setTokenIds(ids);
        emit SetTokenIds();
    }
}
