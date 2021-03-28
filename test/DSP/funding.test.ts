/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, MAX_UINT256 } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';
import BigNumber from 'bignumber.js';
const truffleAssert = require('truffle-assertions');

let lp: string;
let trader: string;

async function init(ctx: DVMContext): Promise<void> {
    lp = ctx.SpareAccounts[0];
    trader = ctx.SpareAccounts[1];

    await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"));
    await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"));
}

describe("Funding", () => {
    let snapshotId: string;
    let ctx: DVMContext;

    before(async () => {
        ctx = await getDVMContext();
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("buy shares", () => {

        it("buy shares from init states", async () => {

            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await logGas(ctx.DVM.methods.buyShares(lp), ctx.sendParam(lp), "buy shares");

            // vault balances
            assert.equal(
                await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
                decimalStr("10")
            );
            assert.equal(
                await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
                decimalStr("0")
            );
            assert.equal(
                await ctx.DVM.methods._BASE_RESERVE_().call(),
                decimalStr("10")
            )
            assert.equal(
                await ctx.DVM.methods._QUOTE_RESERVE_().call(),
                decimalStr("0")
            )

            // shares number
            assert.equal(await ctx.DVM.methods.balanceOf(lp).call(), decimalStr("10"))
        });

        it("buy shares from init states with quote != 0", async () => {
            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await ctx.transferQuoteToDVM(lp, decimalStr("100"))
            await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp));
            assert.equal(await ctx.DVM.methods.balanceOf(lp).call(), decimalStr("10"))
            assert.equal(await ctx.DVM.methods.getMidPrice().call(), "102078438912577213500")
        })

        it("buy shares with balanced input", async () => {
            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferQuoteToDVM(trader, decimalStr("200"))
            await ctx.DVM.methods.sellQuote(trader).send(ctx.sendParam(trader))

            var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call())
            var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call())
            var increaseRatio = new BigNumber("0.1")

            await ctx.transferBaseToDVM(trader, vaultBaseBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.transferQuoteToDVM(trader, vaultQuoteBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.DVM.methods.buyShares(trader).send(ctx.sendParam(trader))

            assert.equal(
                await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
                "8852116395368015179"
            );
            assert.equal(
                await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
                "220000000000000000000"
            );

            assert.equal(await ctx.DVM.methods.balanceOf(trader).call(), "999999999999999990")
        })

        it("buy shares with unbalanced input (less quote)", async () => {
            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferQuoteToDVM(trader, decimalStr("200"))
            await ctx.DVM.methods.sellQuote(trader).send(ctx.sendParam(trader))

            var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call())
            var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call())
            var increaseRatio = new BigNumber("0.1")

            await ctx.transferBaseToDVM(trader, vaultBaseBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.transferQuoteToDVM(trader, vaultQuoteBalance.multipliedBy(increaseRatio).div(2).toFixed(0))
            await ctx.DVM.methods.buyShares(trader).send(ctx.sendParam(trader))

            assert.equal(await ctx.DVM.methods.balanceOf(trader).call(), "500000000000000000")
        })

        it("buy shares with unbalanced input (less base)", async () => {
            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferQuoteToDVM(trader, decimalStr("200"))
            await ctx.DVM.methods.sellQuote(trader).send(ctx.sendParam(trader))

            var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call())
            var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call())
            var increaseRatio = new BigNumber("0.1")

            await ctx.transferBaseToDVM(trader, vaultBaseBalance.multipliedBy(increaseRatio).div(2).toFixed(0))
            await ctx.transferQuoteToDVM(trader, vaultQuoteBalance.multipliedBy(increaseRatio).toFixed(0))
            await ctx.DVM.methods.buyShares(trader).send(ctx.sendParam(trader))

            assert.equal(await ctx.DVM.methods.balanceOf(trader).call(), "499999999999999990")
        })
    });

    describe("sell shares", () => {
        it("not the last one sell shares", async () => {
            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await ctx.transferQuoteToDVM(lp, decimalStr("100"))
            await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))

            await ctx.transferBaseToDVM(trader, decimalStr("1"))
            await ctx.transferQuoteToDVM(trader, decimalStr("10"))
            await ctx.DVM.methods.buyShares(trader).send(ctx.sendParam(trader))

            var vaultShares = new BigNumber(await ctx.DVM.methods.balanceOf(lp).call())
            var bob = ctx.SpareAccounts[5]
            await ctx.DVM.methods.sellShares(vaultShares.div(2).toFixed(0), bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp))
            assert.equal(await ctx.BASE.methods.balanceOf(bob).call(), decimalStr("5"))
            assert.equal(await ctx.QUOTE.methods.balanceOf(bob).call(), decimalStr("50"))

            await ctx.DVM.methods.sellShares(vaultShares.div(2).toFixed(0), bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp))
            assert.equal(await ctx.BASE.methods.balanceOf(bob).call(), decimalStr("10"))
            assert.equal(await ctx.QUOTE.methods.balanceOf(bob).call(), decimalStr("100"))
        })

        it("the last one sell shares", async () => {
            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await ctx.transferQuoteToDVM(lp, decimalStr("100"))
            await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))

            var vaultShares = await ctx.DVM.methods.balanceOf(lp).call()
            var bob = ctx.SpareAccounts[5]
            await ctx.DVM.methods.sellShares(vaultShares, bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp))
            assert.equal(await ctx.BASE.methods.balanceOf(bob).call(), decimalStr("10"))
            assert.equal(await ctx.QUOTE.methods.balanceOf(bob).call(), decimalStr("100"))
        })

        it("revert cases", async () => {
            await ctx.transferBaseToDVM(lp, decimalStr("10"))
            await ctx.transferQuoteToDVM(lp, decimalStr("100"))
            await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))

            var vaultShares = await ctx.DVM.methods.balanceOf(lp).call()
            var bob = ctx.SpareAccounts[5]
            await truffleAssert.reverts(
                ctx.DVM.methods.sellShares(new BigNumber(vaultShares).multipliedBy(2), bob, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(lp)),
                "DLP_NOT_ENOUGH"
            )
            await truffleAssert.reverts(
                ctx.DVM.methods.sellShares(vaultShares, bob, decimalStr("100"), 0, "0x", MAX_UINT256).send(ctx.sendParam(lp)),
                "WITHDRAW_NOT_ENOUGH"
            )
            await truffleAssert.reverts(
                ctx.DVM.methods.sellShares(vaultShares, bob, 0, decimalStr("10000"), "0x", MAX_UINT256).send(ctx.sendParam(lp)),
                "WITHDRAW_NOT_ENOUGH"
            )
            await truffleAssert.reverts(
                ctx.DVM.methods.sellShares(vaultShares, bob, 0, decimalStr("10000"), "0x", "0").send(ctx.sendParam(lp)),
                "TIME_EXPIRED"
            )
        })
    })
});
