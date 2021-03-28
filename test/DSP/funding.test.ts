/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, MAX_UINT256 } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DSPContext, getDSPContext } from '../utils/DSPContext';
import { assert } from 'chai';
import BigNumber from 'bignumber.js';
const truffleAssert = require('truffle-assertions');

let lp: string;
let trader: string;

async function init(ctx: DSPContext): Promise<void> {
    lp = ctx.SpareAccounts[0];
    trader = ctx.SpareAccounts[1];

    await ctx.mintTestToken(lp, decimalStr("1000"), decimalStr("1000"));
    await ctx.mintTestToken(trader, decimalStr("1000"), decimalStr("1000"));
}

describe("Funding", () => {
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

    describe("buy shares", () => {

        it("revert cases", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("10"))
            await truffleAssert.reverts(
                ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp)),
                "MINT_AMOUNT_NOT_ENOUGH"
            )
        })

        it("buy shares from init states", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("100"))
            await ctx.transferQuoteToDSP(lp, decimalStr("100"))
            await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp));
            assert.equal(await ctx.DSP.methods.balanceOf(lp).call(), decimalStr("100"))
            assert.equal(await ctx.DSP.methods.getMidPrice().call(), decimalStr("1"))
        })

        it("buy shares with balanced input", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("100"))
            await ctx.transferQuoteToDSP(lp, decimalStr("100"))
            await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferQuoteToDSP(trader, decimalStr("20"))
            await ctx.DSP.methods.sellQuote(trader).send(ctx.sendParam(trader))

            var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.DSP.options.address).call())
            var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.DSP.options.address).call())
            var increaseRatio = new BigNumber("0.1")

            await ctx.transferBaseToDSP(trader, vaultBaseBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.transferQuoteToDSP(trader, vaultQuoteBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.DSP.methods.buyShares(trader).send(ctx.sendParam(trader))

            assert.equal(
                await ctx.BASE.methods.balanceOf(ctx.DSP.options.address).call(),
                "88521163953680151790"
            );
            assert.equal(
                await ctx.QUOTE.methods.balanceOf(ctx.DSP.options.address).call(),
                "132000000000000000000"
            );

            assert.equal(await ctx.DSP.methods.balanceOf(trader).call(), decimalStr("10"))
        })

        it("buy shares with unbalanced input (less quote)", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("100"))
            await ctx.transferQuoteToDSP(lp, decimalStr("100"))
            await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferQuoteToDSP(trader, decimalStr("20"))
            await ctx.DSP.methods.sellQuote(trader).send(ctx.sendParam(trader))

            var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.DSP.options.address).call())
            var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.DSP.options.address).call())
            var increaseRatio = new BigNumber("0.1")

            await ctx.transferBaseToDSP(trader, vaultBaseBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.transferQuoteToDSP(trader, vaultQuoteBalance.multipliedBy(increaseRatio).div(2).toFixed(0))
            await ctx.DSP.methods.buyShares(trader).send(ctx.sendParam(trader))

            assert.equal(await ctx.DSP.methods.balanceOf(trader).call(), decimalStr("5"))
        })

        it("buy shares with unbalanced input (less base)", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("100"))
            await ctx.transferQuoteToDSP(lp, decimalStr("100"))
            await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferQuoteToDSP(trader, decimalStr("20"))
            await ctx.DSP.methods.sellQuote(trader).send(ctx.sendParam(trader))

            var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.DSP.options.address).call())
            var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.DSP.options.address).call())
            var increaseRatio = new BigNumber("0.1")

            await ctx.transferBaseToDSP(trader, vaultBaseBalance.multipliedBy(increaseRatio).div(2).toFixed(0))
            await ctx.transferQuoteToDSP(trader, vaultQuoteBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.DSP.methods.buyShares(trader).send(ctx.sendParam(trader))

            assert.equal(await ctx.DSP.methods.balanceOf(trader).call(), "4999999999999999900")
        })
    });

    describe("sell shares", () => {
        it("not the last one sell shares", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("100"))
            await ctx.transferQuoteToDSP(lp, decimalStr("100"))
            await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferBaseToDSP(trader, decimalStr("10"))
            await ctx.transferQuoteToDSP(trader, decimalStr("10"))
            await ctx.DSP.methods.buyShares(trader).send(ctx.sendParam(trader))

            var vaultShares = new BigNumber(await ctx.DSP.methods.balanceOf(lp).call())
            var bob = ctx.SpareAccounts[5]
            await ctx.DSP.methods.sellShares(vaultShares.div(2).toFixed(0), bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp))
            assert.equal(await ctx.BASE.methods.balanceOf(bob).call(), decimalStr("50"))
            assert.equal(await ctx.QUOTE.methods.balanceOf(bob).call(), decimalStr("50"))

            await ctx.DSP.methods.sellShares(vaultShares.div(2).toFixed(0), bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp))
            assert.equal(await ctx.BASE.methods.balanceOf(bob).call(), decimalStr("100"))
            assert.equal(await ctx.QUOTE.methods.balanceOf(bob).call(), decimalStr("100"))
        })

        it("the last one sell shares", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("100"))
            await ctx.transferQuoteToDSP(lp, decimalStr("100"))
            await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp))

            var vaultShares = await ctx.DSP.methods.balanceOf(lp).call()
            var bob = ctx.SpareAccounts[5]
            await ctx.DSP.methods.sellShares(vaultShares, bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp))
            assert.equal(await ctx.BASE.methods.balanceOf(bob).call(), decimalStr("100"))
            assert.equal(await ctx.QUOTE.methods.balanceOf(bob).call(), decimalStr("100"))
        })

        it("revert cases", async () => {
            await ctx.transferBaseToDSP(lp, decimalStr("100"))
            await ctx.transferQuoteToDSP(lp, decimalStr("100"))
            await ctx.DSP.methods.buyShares(lp).send(ctx.sendParam(lp))

            var vaultShares = await ctx.DSP.methods.balanceOf(lp).call()
            var bob = ctx.SpareAccounts[5]
            await truffleAssert.reverts(
                ctx.DSP.methods.sellShares(new BigNumber(vaultShares).multipliedBy(2), bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp)),
                "DLP_NOT_ENOUGH"
            )
            await truffleAssert.reverts(
                ctx.DSP.methods.sellShares(vaultShares, bob, decimalStr("1000"), 0, "0x", MAX_UINT256).send(ctx.sendParam(lp)),
                "WITHDRAW_NOT_ENOUGH"
            )
            await truffleAssert.reverts(
                ctx.DSP.methods.sellShares(vaultShares, bob, 0, decimalStr("1000"), "0x", MAX_UINT256).send(ctx.sendParam(lp)),
                "WITHDRAW_NOT_ENOUGH"
            )
            await truffleAssert.reverts(
                ctx.DSP.methods.sellShares(vaultShares, bob, 0, decimalStr("10000"), "0x", "0").send(ctx.sendParam(lp)),
                "TIME_EXPIRED"
            )
        })
    })
});
