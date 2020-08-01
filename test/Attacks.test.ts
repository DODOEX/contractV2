/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { DODOContext, getDODOContext } from './utils/Context';
import { decimalStr, gweiStr } from './utils/Converter';
import BigNumber from "bignumber.js";
import * as assert from "assert"

let lp1: string
let lp2: string
let trader: string
let hacker: string

async function init(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(decimalStr("100"))
  lp1 = ctx.spareAccounts[0]
  lp2 = ctx.spareAccounts[1]
  trader = ctx.spareAccounts[2]
  hacker = ctx.spareAccounts[3]
  await ctx.mintTestToken(lp1, decimalStr("100"), decimalStr("10000"))
  await ctx.mintTestToken(lp2, decimalStr("100"), decimalStr("10000"))
  await ctx.mintTestToken(trader, decimalStr("100"), decimalStr("10000"))
  await ctx.mintTestToken(hacker, decimalStr("10000"), decimalStr("1000000"))
  await ctx.approveDODO(lp1)
  await ctx.approveDODO(lp2)
  await ctx.approveDODO(trader)
  await ctx.approveDODO(hacker)
}

describe("Attacks", () => {

  let snapshotId: string
  let ctx: DODOContext

  before(async () => {
    ctx = await getDODOContext()
    await init(ctx);
  })

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId)
  });

  describe("Price offset attack", () => {
    /*
      attack describe:
      1. hacker deposit a great number of base token
      2. hacker buy base token
      3. hacker withdraw a great number of base token
      4. hacker sell or buy base token to finish the arbitrage loop

      expected: 
      1. hacker won't earn any quote token or sell base token with price better than what dodo provides
      2. quote token lp and base token lp have no loss

      Same in quote direction
    */
    it("attack on base token", async () => {
      await ctx.DODO.methods.depositBase(decimalStr("10")).send(ctx.sendParam(lp1))
      await ctx.DODO.methods.depositQuote(decimalStr("1000")).send(ctx.sendParam(lp1))
      let hackerInitBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(hacker).call())
      let hackerInitQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(hacker).call())
      // attack step 1
      await ctx.DODO.methods.depositBase(decimalStr("5000")).send(ctx.sendParam(hacker))
      // attack step 2
      await ctx.DODO.methods.buyBaseToken(decimalStr("9.5"), decimalStr("2000"), "0x").send(ctx.sendParam(hacker))
      // attack step 3
      await ctx.DODO.methods.withdrawBase(decimalStr("5000")).send(ctx.sendParam(hacker))
      // attack step 4
      let hackerTempBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(hacker).call())
      if (hackerTempBaseBalance.isGreaterThan(hackerInitBaseBalance)) {
        await ctx.DODO.methods.sellBaseToken(hackerTempBaseBalance.minus(hackerInitBaseBalance).toString(), "0", "0x").send(ctx.sendParam(hacker))
      } else {
        await ctx.DODO.methods.buyBaseToken(hackerInitBaseBalance.minus(hackerTempBaseBalance).toString(), decimalStr("5000"), "0x").send(ctx.sendParam(hacker))
      }

      // expected hacker no profit
      let hackerBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(hacker).call())
      let hackerQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(hacker).call())

      assert.ok(hackerBaseBalance.isLessThanOrEqualTo(hackerInitBaseBalance))
      assert.ok(hackerQuoteBalance.isLessThanOrEqualTo(hackerInitQuoteBalance))

      // expected lp no loss
      let lpBaseBalance = new BigNumber(await ctx.DODO.methods.getLpBaseBalance(lp1).call())
      let lpQuoteBalance = new BigNumber(await ctx.DODO.methods.getLpQuoteBalance(lp1).call())

      assert.ok(lpBaseBalance.isGreaterThanOrEqualTo(decimalStr("10")))
      assert.ok(lpQuoteBalance.isGreaterThanOrEqualTo(decimalStr("1000")))
    })

    it("attack on quote token", async () => {
      await ctx.DODO.methods.depositBase(decimalStr("10")).send(ctx.sendParam(lp1))
      await ctx.DODO.methods.depositQuote(decimalStr("1000")).send(ctx.sendParam(lp1))
      let hackerInitBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(hacker).call())
      let hackerInitQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(hacker).call())

      // attack step 1
      await ctx.DODO.methods.depositQuote(decimalStr("100000")).send(ctx.sendParam(hacker))
      // attack step 2
      await ctx.DODO.methods.sellBaseToken(decimalStr("9"), decimalStr("500"), "0x").send(ctx.sendParam(hacker))
      // attack step 3
      await ctx.DODO.methods.withdrawQuote(decimalStr("100000")).send(ctx.sendParam(hacker))
      // attack step 4
      let hackerTempBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(hacker).call())
      if (hackerTempBaseBalance.isGreaterThan(hackerInitBaseBalance)) {
        await ctx.DODO.methods.sellBaseToken(hackerTempBaseBalance.minus(hackerInitBaseBalance).toString(), "0", "0x").send(ctx.sendParam(hacker))
      } else {
        await ctx.DODO.methods.buyBaseToken(hackerInitBaseBalance.minus(hackerTempBaseBalance).toString(), decimalStr("5000"), "0x").send(ctx.sendParam(hacker))
      }

      // expected hacker no profit
      let hackerBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(hacker).call())
      let hackerQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(hacker).call())

      assert.ok(hackerBaseBalance.isLessThanOrEqualTo(hackerInitBaseBalance))
      assert.ok(hackerQuoteBalance.isLessThanOrEqualTo(hackerInitQuoteBalance))

      // expected lp no loss
      let lpBaseBalance = new BigNumber(await ctx.DODO.methods.getLpBaseBalance(lp1).call())
      let lpQuoteBalance = new BigNumber(await ctx.DODO.methods.getLpQuoteBalance(lp1).call())

      assert.ok(lpBaseBalance.isGreaterThanOrEqualTo(decimalStr("10")))
      assert.ok(lpQuoteBalance.isGreaterThanOrEqualTo(decimalStr("1000")))
    })
  })

  describe("Front run attack", () => {
    /*
      attack describe:
      hacker tries to front run oracle updating by sending tx with higher gas price

      expected:
      revert tx
    */
    it("front run", async () => {
      await ctx.DODO.methods.depositBase(decimalStr("10")).send(ctx.sendParam(lp1))
      await ctx.DODO.methods.depositQuote(decimalStr("1000")).send(ctx.sendParam(lp1))
      await assert.rejects(
        ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("200"), "0x").send({ from: trader, gas: 300000, gasPrice: gweiStr("200") }), /GAS_PRICE_EXCEED/
      )
      await assert.rejects(
        ctx.DODO.methods.sellBaseToken(decimalStr("1"), decimalStr("200"), "0x").send({ from: trader, gas: 300000, gasPrice: gweiStr("200") }), /GAS_PRICE_EXCEED/
      )
    })

  })

})