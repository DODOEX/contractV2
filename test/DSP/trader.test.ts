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

            console.log("Balance:", balances);
            // assert.equal(balances.traderBase, "10986174542266106307")
            // assert.equal(balances.traderQuote, decimalStr("900"))
            // assert.equal(balances.DPPBase, "9012836315765723075")
            // assert.equal(balances.DPPQuote, decimalStr("1100"))
            // assert.equal(balances.maintainerBase, "989141968170618")
            // assert.equal(balances.maintainerQuote, "0")

            // buy at R>1
            await ctx.transferQuoteToDSP(trader, decimalStr("100"))
            await logGas(ctx.DSP.methods.sellQuote(trader), ctx.sendParam(trader), "sellQuote - buy at R>1")
            balances = await ctx.getBalances(trader)
            console.log("Balance:", balances);

            // assert.equal(balances.traderBase, "11946772292527553373")
            // assert.equal(balances.traderQuote, decimalStr("800"))
            // assert.equal(balances.DPPBase, "8051275077289369844")
            // assert.equal(balances.DPPQuote, decimalStr("1200"))
            // assert.equal(balances.maintainerBase, "1952630183076783")
            // assert.equal(balances.maintainerQuote, "0")

            // sell at R>1 and R not change state
            await ctx.transferBaseToDSP(trader, decimalStr("100"))
            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - sell at R>1 and R not change state")
            balances = await ctx.getBalances(trader)
            console.log("Balance:", balances);
            // assert.equal(balances.traderBase, "10946772292527553373")
            // assert.equal(balances.traderQuote, "903421814651005338950")
            // assert.equal(balances.DPPBase, "9051275077289369844")
            // assert.equal(balances.DPPQuote, "1096474452335302579467")
            // assert.equal(balances.maintainerBase, "1952630183076783")
            // assert.equal(balances.maintainerQuote, "103733013692081583")


            // sell at R>1 and R change state
            await ctx.transferBaseToDSP(trader, decimalStr("200"))

            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - sell at R>1 and R change state")
            balances = await ctx.getBalances(trader)
            console.log("Balance:", balances);

            // assert.equal(balances.traderBase, "8946772292527553373")
            // assert.equal(balances.traderQuote, "1102638273848343281094")
            // assert.equal(balances.DPPBase, "11051275077289369844")
            // assert.equal(balances.DPPQuote, "897058177231046545105")
            // assert.equal(balances.maintainerBase, "1952630183076783")
            // assert.equal(balances.maintainerQuote, "303548920610173801")

            var PMMStat = await ctx.DSP.methods.getPMMState().call()
            console.log("PMMStat:", PMMStat)
            // assert.equal(PMMStat.R, "2")
            // assert.equal(PMMStat.B0, "10005950249348099200")
        });

        it("first sell and then buy", async () => {
            // sell at R=1
            await ctx.transferBaseToDSP(trader, decimalStr("1"))
            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - sell at R=1")
            var balances = await ctx.getBalances(trader)
            console.log("balances:",balances)

            // assert.equal(balances.traderBase, decimalStr("9"))
            // assert.equal(balances.traderQuote, "1098617454226610630663")
            // assert.equal(balances.DPPBase, decimalStr("11"))
            // assert.equal(balances.DPPQuote, "901283631576572307521")
            // assert.equal(balances.maintainerBase, "0")
            // assert.equal(balances.maintainerQuote, "98914196817061816")

            // buy at R>1
            await ctx.transferBaseToDSP(trader, decimalStr("1"))
            await logGas(ctx.DSP.methods.sellBase(trader), ctx.sendParam(trader), "sellBase - buy at R>1")
            balances = await ctx.getBalances(trader)
            console.log("balances:", balances)

            // assert.equal(balances.traderBase, decimalStr("8"))
            // assert.equal(balances.traderQuote, "1194677229252755337109")
            // assert.equal(balances.DPPBase, decimalStr("12"))
            // assert.equal(balances.DPPQuote, "805127507728936984519")
            // assert.equal(balances.maintainerBase, "0")
            // assert.equal(balances.maintainerQuote, "195263018307678372")

            // sell at R>1 and R not change state
            await ctx.transferQuoteToDSP(trader, decimalStr("1"))
            await logGas(ctx.DSP.methods.sellQuote(trader), ctx.sendParam(trader), "sell at R>1 and R not change state")
            balances = await ctx.getBalances(trader)
            console.log("balances:", balances)

            // assert.equal(balances.traderBase, "9034218146510053391")
            // assert.equal(balances.traderQuote, "1094677229252755337109")
            // assert.equal(balances.DPPBase, "10964744523353025794")
            // assert.equal(balances.DPPQuote, "905127507728936984519")
            // assert.equal(balances.maintainerBase, "1037330136920815")
            // assert.equal(balances.maintainerQuote, "195263018307678372")

            // sell at R>1 and R change state
            await ctx.transferQuoteToDSP(trader, decimalStr("2"))
            await logGas(ctx.DSP.methods.sellQuote(trader), ctx.sendParam(trader), "sell at R>1 and R change state")
            balances = await ctx.getBalances(trader)
            console.log("balances:", balances)

            // assert.equal(balances.traderBase, "11026382738483432812")
            // assert.equal(balances.traderQuote, "894677229252755337109")
            // assert.equal(balances.DPPBase, "8970581772310465451")
            // assert.equal(balances.DPPQuote, "1105127507728936984519")
            // assert.equal(balances.maintainerBase, "3035489206101737")
            // assert.equal(balances.maintainerQuote, "195263018307678372")

            var PMMStat = await ctx.DSP.methods.getPMMState().call()
            console.log("PMMStat:", PMMStat)

            // assert.equal(PMMStat.R, "1")
            // assert.equal(PMMStat.Q0, "1000595024934809920179")
        });

        it("flash loan", async () => {
            // buy
            await ctx.transferQuoteToDSP(trader, decimalStr("200"))

            // buy failed
            await truffleAssert.reverts(ctx.DSP.methods.flashLoan("1946763594380080790", "0", trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

            // buy succeed
            await ctx.DSP.methods.flashLoan("1946763594380080789", "0", trader, "0x").send(ctx.sendParam(trader))

            // trader balances
            assert.equal(
                await ctx.BASE.methods.balanceOf(trader).call(),
                "11946763594380080789"
            );

            // sell
            await ctx.transferBaseToDSP(trader, decimalStr("1"))

            // sell failed
            await truffleAssert.reverts(ctx.DSP.methods.flashLoan("0", "103421810640399874606", trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

            // sell succeed
            await ctx.DSP.methods.flashLoan("0", "103421810640399874605", trader, "0x").send(ctx.sendParam(trader))

            // trader balances
            assert.equal(
                await ctx.QUOTE.methods.balanceOf(trader).call(),
                "903421810640399874605"
            );
        })
    });
});
