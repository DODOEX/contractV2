/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
    
*/

pragma solidity 0.6.9;

import {IDODOAdapter} from "../intf/IDODOAdapter.sol";
import {IUni} from "../intf/IUni.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";

contract UniAdapter is IDODOAdapter {
    using SafeMath for uint;

    //fromToken == token0
    function sellBase(address to, address pool, bytes memory data) external override {
        address baseToken = IUni(pool).token0();
        (uint reserveIn, uint reserveOut,) = IUni(pool).getReserves();
        uint receiveQuoteAmount;
        {
        (uint256 fee, uint256 denFee) = abi.decode(data, (uint256, uint256));
        require(reserveIn > 0 && reserveOut > 0, 'UniAdapter: INSUFFICIENT_LIQUIDITY');

        uint balance0 = IERC20(baseToken).balanceOf(pool);
        uint sellBaseAmount = balance0 - reserveIn;
        
        uint sellBaseAmountWithFee = sellBaseAmount.mul(denFee - fee);
        uint numerator = sellBaseAmountWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(denFee).add(sellBaseAmountWithFee);
        receiveQuoteAmount = numerator / denominator;
        }
        IUni(pool).swap(0, receiveQuoteAmount, to, new bytes(0));
    }

    //fromToken == token1
    function sellQuote(address to, address pool, bytes memory data) external override {
        address quoteToken = IUni(pool).token1();
        (uint reserveOut, uint reserveIn,) = IUni(pool).getReserves();
        uint receiveBaseAmount;
        {
        (uint256 fee, uint256 denFee) = abi.decode(data, (uint256, uint256));
        require(reserveIn > 0 && reserveOut > 0, 'UniAdapter: INSUFFICIENT_LIQUIDITY');

        uint balance1 = IERC20(quoteToken).balanceOf(pool);
        uint sellQuoteAmount = balance1 - reserveIn;

        uint sellQuoteAmountWithFee = sellQuoteAmount.mul(denFee - fee);
        uint numerator = sellQuoteAmountWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(denFee).add(sellQuoteAmountWithFee);
        receiveBaseAmount = numerator / denominator;
        }
        IUni(pool).swap(receiveBaseAmount, 0, to, new bytes(0));
    }
}