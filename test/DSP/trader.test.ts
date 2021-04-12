/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, gweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DSPContext, getDSPContext } from '../utils/DSPContext';
import { assert } from 'chai';
const truffleAssert = require('truffle-assertions');

let lp: string;
let trader: string;

async function init(ctx: DSPContext): Promise<void> {
    lp = ctx.Deployer
    trader = ctx.SpareAccounts[1];

    await ctx.mintTestToken(lp, decimalStr("1000"), decimalStr("1000"));
    await ctx.mintTestToken(trader, decimalStr("1000"), decimalStr("1000"));

    await ctx.transferBaseToDSP(lp, decimalStr("1000"))
    await ctx.transferQuoteToDSP(lp, decimalStr("1000"))
    await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp))
}

describe("DSP Trader", () => {
    let snapshotId: string;
    let ctx: DSPContext;

    before(async () => {
        ctx = await getDSPContext();
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("trade", () => {

        it("first buy and then sell", async () => {
            // buy at R=1
            await ctx.transferQuoteToDSP(trader, decimalStr("100"))
            await logGas(ctx.DSP.methods.sellQuote(trader), ctx.sendParam(trader), "sellQuote - buy at R=1")
            var balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, "1098914196817061816111")
            assert.equal(balances.traderQuote, decimalStr("900"))
            assert.equal(balances.DSPBase, "901085803182938183889")
            assert.equal(balances.DSPQuote, decimalStr("1100"))
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")

            // buy at R>1
            await ctx.transferQuoteToDSP(trader, decimalStr("100"))
            await logGas(ctx.DSP.methods.sellQuote(trader), ctx.sendParam(trader), "sellQuote - buy at R>1")
            balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, "1195262145875634983260")
            assert.equal(balances.traderQuote, decimalStr("800"))
            assert.equal(balances.DSPBase, "804737854124365016740")
            assert.equal(balances.DSPQuote, decimalStr("1200"))
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")

            // sell at R>1 and R not change state
            await ctx.transferBaseToDSP(trader, decimalStr("100"))
            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - sell at R>1 and R not change state")
            balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, "1095262145875634983260")
            assert.equal(balances.traderQuote, "903734814802481693100")
            assert.equal(balances.DSPBase, "904737854124365016740")
            assert.equal(balances.DSPQuote, "1096265185197518306900")
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")


            // sell at R>1 and R change state
            await ctx.transferBaseToDSP(trader, decimalStr("200"))

            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - sell at R>1 and R change state")
            balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, "895262145875634983260")
            assert.equal(balances.traderQuote, "1103541932946094354686")
            assert.equal(balances.DSPBase, "1104737854124365016740")
            assert.equal(balances.DSPQuote, "896458067053905645314")
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")

            var PMMStat = await ctx.DSP.methods.getPMMState().call()
            assert.equal(PMMStat.R, "2")
            assert.equal(PMMStat.B0, "999999999999999996713")
        });

        it("first sell and then buy", async () => {
            // sell at R=1
            await ctx.transferBaseToDSP(trader, decimalStr("1"))
            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - sell at R=1")
            var balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, decimalStr("999"))
            assert.equal(balances.traderQuote, "1000999899919944970392")
            assert.equal(balances.DSPBase, decimalStr("1001"))
            assert.equal(balances.DSPQuote, "999000100080055029608")
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")

            // buy at R>1
            await ctx.transferBaseToDSP(trader, decimalStr("1"))
            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - buy at R>1")
            balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, decimalStr("998"))
            assert.equal(balances.traderQuote, "1001999599359119051790")
            assert.equal(balances.DSPBase, decimalStr("1002"))
            assert.equal(balances.DSPQuote, "998000400640880948210")
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")

            // sell at R>1 and R not change state
            await ctx.transferQuoteToDSP(trader, decimalStr("1"))
            await logGas(ctx.DSP.methods.sellQuote(trader), ctx.sendParam(trader), "sell at R>1 and R not change state")
            balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, "999000300621013276966")
            assert.equal(balances.traderQuote, "1000999599359119051790")
            assert.equal(balances.DSPBase, "1000999699378986723034")
            assert.equal(balances.DSPQuote, "999000400640880948210")
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")

            // sell at R>1 and R change state
            await ctx.transferQuoteToDSP(trader, decimalStr("2"))
            await logGas(ctx.DSP.methods.sellQuote(trader), ctx.sendParam(trader), "sell at R>1 and R change state")
            balances = await ctx.getBalances(trader)

            assert.equal(balances.traderBase, "1001000300480585414741")
            assert.equal(balances.traderQuote, "998999599359119051790")
            assert.equal(balances.DSPBase, "998999699519414585259")
            assert.equal(balances.DSPQuote, "1001000400640880948210")
            assert.equal(balances.maintainerBase, "0")
            assert.equal(balances.maintainerQuote, "0")

            var PMMStat = await ctx.DSP.methods.getPMMState().call()
            assert.equal(PMMStat.R, "1")
            assert.equal(PMMStat.Q0, "999999999999999995766")
        });

        it("flash loan", async () => {
            // buy
            await ctx.transferQuoteToDSP(trader, decimalStr("100"))

            // buy failed
            await truffleAssert.reverts(ctx.DSP.methods.flashLoan("901085803182938100000", decimalStr("101"), trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

            // buy succeed
            await ctx.DSP.methods.flashLoan("98914196817061816111", "0", trader, "0x").send(ctx.sendParam(trader))

            // trader balances
            assert.equal(
                await ctx.BASE.methods.balanceOf(trader).call(),
                "1098914196817061816111"
            );

            // sell
            await ctx.transferBaseToDSP(trader, decimalStr("1"))

            // sell failed
            await truffleAssert.reverts(ctx.DSP.methods.flashLoan(decimalStr("2"), "1", trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

            // sell succeed
            await ctx.DSP.methods.flashLoan("0", "999899919944970392", trader, "0x").send(ctx.sendParam(trader))

            // trader balances
            assert.equal(
                await ctx.QUOTE.methods.balanceOf(trader).call(),
                "900999899919944970392"
            );
        })
    });
});
