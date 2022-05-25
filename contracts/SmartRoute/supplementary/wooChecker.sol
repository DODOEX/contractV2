/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IWooPP} from "../intf/IWooPP.sol";
import {IWooracle} from "../intf/IWooracle.sol";
import {IWooGuardian} from "../intf/IWooGuardian.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";


contract WOOChecker is InitializableOwnable{
    address QUOTE_TOKEN;
    address WOO_ORACLE;
    address WOO_GUARDIAN;

    constructor(
        address _quoteToken,
        address _wooracle,
        address _wooGuardian
    ) public {
        QUOTE_TOKEN = _quoteToken;
        WOO_ORACLE = _wooracle;
        WOO_GUARDIAN = _wooGuardian;
    }

    function init(address owner) external {
        initOwner(owner);
    }
    
    function checkTokenPrice(
        address baseToken
    ) public view returns (bool) {
        bool flag = true;

        uint256 p;
        bool isFeasible;
        (p, , ,isFeasible) = IWooracle(WOO_ORACLE).state(baseToken);

        if(isFeasible == false) flag = false;
        else{
            try IWooGuardian(WOO_GUARDIAN).checkSwapPrice(p, baseToken, QUOTE_TOKEN) {
                flag;
            } catch {
                flag = false;
            }
        }

        return flag;
    }

    function setWooracle(address new_wooracle) public onlyOwner {
        WOO_ORACLE = new_wooracle;
    }

    function setWooGuardian(address new_guardian) public onlyOwner {
        WOO_GUARDIAN = new_guardian;
    }

    function setQuoteToken(address new_quoteToken) public onlyOwner {
        QUOTE_TOKEN = new_quoteToken;
    }
}