/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {CPVesting} from "./CPVesting.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IPermissionManager} from "../../lib/PermissionManager.sol";
import {IFeeRateModel} from "../../lib/FeeRateModel.sol";
import {SafeMath} from "../../lib/SafeMath.sol";

/**
 * @title DODO CrowdPooling
 * @author DODO Breeder
 *
 * @notice CrowdPooling initialization
 */
contract CP is CPVesting {
    using SafeMath for uint256;

    receive() external payable {
        require(_INITIALIZED_ == false, "WE_NOT_SAVE_ETH_AFTER_INIT");
    }

    function init(
        address[] calldata addressList,
        uint256[] calldata timeLine,
        uint256[] calldata valueList,
        bool[] calldata switches //0 isOverCapStop 1 isOpenTWAP
    ) external {
        /*
        Address List
        0. owner
        1. maintainer
        2. baseToken
        3. quoteToken
        4. permissionManager
        5. feeRateModel
        6. poolFactory
      */

        require(addressList.length == 7, "LIST_LENGTH_WRONG");

        initOwner(addressList[0]);
        _MAINTAINER_ = addressList[1];
        _BASE_TOKEN_ = IERC20(addressList[2]);
        _QUOTE_TOKEN_ = IERC20(addressList[3]);
        _BIDDER_PERMISSION_ = IPermissionManager(addressList[4]);
        _MT_FEE_RATE_MODEL_ = IFeeRateModel(addressList[5]);
        _POOL_FACTORY_ = addressList[6];

        /*
        Time Line
        0. phase bid starttime
        1. phase bid duration
        2. phase calm duration
        3. freeze duration
        4. vesting duration
        5. claim freeze duration
        6. claim vesting duration
        */

        require(timeLine.length == 7, "LIST_LENGTH_WRONG");

        _PHASE_BID_STARTTIME_ = timeLine[0];
        _PHASE_BID_ENDTIME_ = _PHASE_BID_STARTTIME_.add(timeLine[1]);
        _PHASE_CALM_ENDTIME_ = _PHASE_BID_ENDTIME_.add(timeLine[2]);

        _FREEZE_DURATION_ = timeLine[3];
        _VESTING_DURATION_ = timeLine[4];
        _TOKEN_CLAIM_DURATION_ = timeLine[5];
        _TOKEN_VESTING_DURATION_ = timeLine[6];
        require(block.timestamp <= _PHASE_BID_STARTTIME_, "TIMELINE_WRONG");

        /*
        Value List
        0. pool quote cap
        1. k
        2. i
        3. lp cliff rate
        4. base token cliff rate
        5. lp fee rate
        */

        require(valueList.length == 6, "LIST_LENGTH_WRONG");

        _POOL_QUOTE_CAP_ = valueList[0];
        _K_ = valueList[1];
        _I_ = valueList[2];
        _CLIFF_RATE_ = valueList[3];
        _TOKEN_CLIFF_RATE_ = valueList[4];
        _POOL_FEE_RATE_ = valueList[5];

        require(_I_ > 0 && _I_ <= 1e36, "I_VALUE_WRONG");
        require(_K_ <= 1e18, "K_VALUE_WRONG");
        require(_CLIFF_RATE_ <= 1e18, "CLIFF_RATE_WRONG");
        require(_TOKEN_CLIFF_RATE_ <= 1e18, "TOKEN_CLIFF_RATE_WRONG");

        _TOTAL_BASE_ = _BASE_TOKEN_.balanceOf(address(this));

        require(switches.length == 2, "SWITCHES_LENGTH_WRONG");

        _IS_OVERCAP_STOP = switches[0];
        _IS_OPEN_TWAP_ = switches[1];

        require(address(this).balance == _SETTEL_FUND_, "SETTLE_FUND_NOT_MATCH");
    }

    // ============ Version Control ============

    function version() virtual external pure returns (string memory) {
        return "CP 2.0.0";
    }

    
    // ============= View =================
    function getCpInfoHelper(address user) external view returns (
        bool isSettled,
        uint256 settledTime,
        uint256 claimableBaseToken,
        uint256 claimedBaseToken,
        bool isClaimedQuoteToken,
        uint256 claimableQuoteToken,
        address pool,
        uint256 claimableLpToken,
        uint256 myShares,
        bool isOverCapStop
    ) {
        isSettled = _SETTLED_;
        settledTime = _SETTLED_TIME_;
        if(_SETTLED_ && block.timestamp >= _SETTLED_TIME_.add(_TOKEN_CLAIM_DURATION_)) {
            claimableBaseToken = getClaimableBaseToken(user);
            claimedBaseToken = _CLAIMED_BASE_TOKEN_[user];
        }else {
            claimableBaseToken = 0;
            claimedBaseToken = 0;
        }

        if(_SETTLED_) {
            if(_CLAIMED_QUOTE_[msg.sender]) {
                isClaimedQuoteToken = true;
                claimableQuoteToken = 0;
            } else {
                isClaimedQuoteToken = false;
                claimableQuoteToken = _UNUSED_QUOTE_.mul(_SHARES_[user]).div(_TOTAL_SHARES_);
            }
        } else {
            isClaimedQuoteToken = false;
            claimableQuoteToken = 0;
        }

        pool = _POOL_;

        if(_SETTLED_ && block.timestamp >= _SETTLED_TIME_.add(_FREEZE_DURATION_)) {
            if(user == _OWNER_) {
                claimableLpToken = getClaimableLPToken();
            }else {
                claimableLpToken = 0;
            }
        }else {
            claimableLpToken = 0;
        }

        myShares = _SHARES_[user];

        isOverCapStop = _IS_OVERCAP_STOP;
    }
}
