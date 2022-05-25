/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IUniswapV3Pool} from "../intf/uniV3/IUniswapV3Pool.sol";
import {TickBitmap} from "../lib/TickBitmap.sol";
//import {ITickLens} from "@uniswap/v3-periphery/contracts/interfaces/ITickLens.sol";

contract UniV3TickHelper {
    using TickBitmap for mapping(int16 => uint256);

    struct PopulatedTick {
        int24 tick;
        int128 liquidityNet;
        uint128 liquidityGross;
    }

    constructor() public {
    }

    // pool: the address of pool
    // var_words: words deviation, 1 word = 256 tick
    // least_ticks: collect ticks more than this number
    function getOnePoolCurrentTicks(
        address pool,
        int16 varWords,
        uint256 leastTicks
    ) public view returns(PopulatedTick[] memory res, uint256 len, int16 wordPos, int16 varW){
        int16 wordPos;
        {
        int24 slot0Tick;
        int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();
        ( ,slot0Tick, , , , , ) = IUniswapV3Pool(pool).slot0();
        slot0Tick = int24(slot0Tick / tickSpacing); 

        //mapping(int16 => uint256) storage tickBitmap = IUniswapV3Pool(pool).tickBitmap;
        //(curTick, ) = tickBitmap.nextInitializedTickWithinOneWord(
        //    slot0Tick,
        //    IUniswapV3Pool(pool).tickSpacing(),
         //   true // not impact result
        //);

        wordPos = int16(slot0Tick >> 8);
        }
         

        // check words to fit least_tick
        uint256 totalTick = _calTickNumberInWord(pool, wordPos);
        {
            int16 iRight = wordPos;
            int16 iLeft = wordPos;
            while(totalTick < leastTicks || iRight - wordPos < varWords) {
                iRight++;
                iLeft--;
                totalTick = totalTick + _calTickNumberInWord(pool, iRight);
                totalTick = totalTick + _calTickNumberInWord(pool, iLeft);
            }

            varWords = iRight - wordPos;
        }

        res = new PopulatedTick[](totalTick);
        for(int16 tickMapIndex = wordPos - varWords; tickMapIndex <= wordPos + varWords; ++tickMapIndex) {
            //curWordTicks = ITickLens(_TICK_LEN).getPopulatedTicksInWord(pool, tickMapIndex);

            // fetch bitmap
            uint256 bitmap = IUniswapV3Pool(pool).tickBitmap(tickMapIndex);

            // fetch populated tick data
            int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();
            for (uint256 i = 0; i < 256; i++) {
                if (bitmap & (1 << i) > 0) {
                    int24 populatedTick = ((int24(tickMapIndex) << 8) + int24(i)) * tickSpacing;
                    (uint128 liquidityGross, int128 liquidityNet, , , , , , ) = IUniswapV3Pool(pool).ticks(populatedTick);
                    res[--totalTick] = PopulatedTick({
                        tick: populatedTick,
                        liquidityNet: liquidityNet,
                        liquidityGross: liquidityGross
                    });
                }
            }  
        }

        return (res, res.length, wordPos, varWords);
    }

    function getWordPos(address pool) public view returns(int16 wordPos) {
        int16 wordPos;
        int24 curTick;
        int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();
        ( ,curTick, , , , , ) = IUniswapV3Pool(pool).slot0();
        curTick = int24(curTick / tickSpacing); 

        //mapping(int16 => uint256) storage tickBitmap = IUniswapV3Pool(pool).tickBitmap;
        //(curTick, ) = tickBitmap.nextInitializedTickWithinOneWord(
        //    slot0Tick,
        //    IUniswapV3Pool(pool).tickSpacing(),
         //   true // not impact result
        //);

        wordPos = int16(curTick >> 8);
        return wordPos;
    }

    function getTotalTick(
        address pool, 
        int16 varWords,
        uint256 leastTicks,
        int16 wordPos
    ) public view returns(uint256 totalTicks, int16 varW) {
        uint256 totalTick = _calTickNumberInWord(pool, wordPos);
        int16 iRight = wordPos;
        int16 iLeft = wordPos;
        while(totalTick < leastTicks || iRight - wordPos < varWords) {
            iRight++;
            iLeft--;
            totalTick = totalTick + _calTickNumberInWord(pool, iRight);
            totalTick = totalTick + _calTickNumberInWord(pool, iLeft);
            
        }

        varWords = iRight - wordPos;

        return (totalTick, varWords);
    }

    function getCertainTicks(
        address pool, 
        int16 wordPos,
        int16 varWords,
        uint256 totalTick
    ) public view returns(PopulatedTick[] memory res) {
        res = new PopulatedTick[](totalTick);
        for(int16 tickMapIndex = wordPos - varWords; tickMapIndex <= wordPos + varWords; ++tickMapIndex) {
            //curWordTicks = ITickLens(_TICK_LEN).getPopulatedTicksInWord(pool, tickMapIndex);

            // fetch bitmap
            uint256 bitmap = IUniswapV3Pool(pool).tickBitmap(tickMapIndex);

            // fetch populated tick data
            int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();
            for (uint256 i = 0; i < 256; i++) {
                if (bitmap & (1 << i) > 0) {
                    int24 populatedTick = ((int24(tickMapIndex) << 8) + int24(i)) * tickSpacing;
                    (uint128 liquidityGross, int128 liquidityNet, , , , , , ) = IUniswapV3Pool(pool).ticks(populatedTick);
                    res[--totalTick] = PopulatedTick({
                        tick: populatedTick,
                        liquidityNet: liquidityNet,
                        liquidityGross: liquidityGross
                    });
                }
            }  
        }

        return res;
    }

    function _calTickNumberInWord(address pool, int16 wordIndex) public view returns(uint256 numberOfTick){
        uint256 numberOfPopulatedTicks;
        uint256 bitmap = IUniswapV3Pool(pool).tickBitmap(wordIndex);
        for (uint256 i = 0; i < 256; i++) {
            if (bitmap & (1 << i) > 0) numberOfPopulatedTicks++;
        }
        return numberOfPopulatedTicks;
    }

}
