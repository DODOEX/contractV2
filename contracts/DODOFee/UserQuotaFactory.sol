/*

    Copyright 2022 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {ICloneFactory} from "../lib/CloneFactory.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";


interface IQuota {
    function initOwner(address newOwner) external;
    function getUserQuota(address user) external view returns (int);
}


/**
 * @title DODO UserQuotaFactory
 * @author DODO Breeder
 *
 */
contract UserQuotaFactory is InitializableOwnable{
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public immutable _USER_QUOTA_TEMPLATE_;

    // ============ Events ============

    event NewQuota(address quota);

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address quotaTemplate
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _USER_QUOTA_TEMPLATE_ = quotaTemplate;
    }

    function createQuota(
        address quotaOwner
    ) external onlyOwner returns(address newQuota){
        newQuota = ICloneFactory(_CLONE_FACTORY_).clone(_USER_QUOTA_TEMPLATE_);
        IQuota(newQuota).initOwner(quotaOwner);
        emit NewQuota(newQuota);
    }
}