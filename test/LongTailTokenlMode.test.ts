/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { DODOContext, getDODOContext } from './utils/Context';
import { decimalStr, gweiStr } from './utils/Converter';
import * as assert from "assert"

let lp: string
let trader: string

async function init(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(decimalStr("10"))

  lp = ctx.spareAccounts[0]
  trader = ctx.spareAccounts[1]
  await ctx.approveDODO(lp)
  await ctx.approveDODO(trader)

  await ctx.mintTestToken(lp, decimalStr("10000"), decimalStr("10000000"))
  await ctx.mintTestToken(trader, decimalStr("0"), decimalStr("10000000"))

  await ctx.DODO.methods.depositBase(decimalStr("10000")).send(ctx.sendParam(lp))
}

describe("Trader", () => {

  let snapshotId: string
  let ctx: DODOContext

  before(async () => {
    let dodoContextInitConfig = {
      lpFeeRate: decimalStr("0"),
      mtFeeRate: decimalStr("0"),
      k: decimalStr("0.99"), // nearly one
      gasPriceLimit: gweiStr("100"),
    }
    ctx = await getDODOContext(dodoContextInitConfig)
    await init(ctx);
  })

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId)
  });

  // price change quickly
  describe("Trade long tail coin", () => {
    it("price discover", async () => {
      // 10% depth
      // avg price = 11.137
      await ctx.DODO.methods.buyBaseToken(decimalStr("1000"), decimalStr("100000")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("1000"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "9988900000000000000000000")

      // 20% depth
      // avg price = 12.475
      await ctx.DODO.methods.buyBaseToken(decimalStr("1000"), decimalStr("100000")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("2000"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "9975049999999999999970000")

      // 50% depth
      // avg price = 19.9
      await ctx.DODO.methods.buyBaseToken(decimalStr("3000"), decimalStr("300000")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("5000"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "9900499999999999999970000")

      // 80% depth
      // avg price = 49.6
      await ctx.DODO.methods.buyBaseToken(decimalStr("3000"), decimalStr("300000")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("8000"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "9603199999999999999970000")
    })

    it("user has no pnl if buy and sell immediately", async () => {
      // lp buy 
      await ctx.DODO.methods.buyBaseToken(decimalStr("1000"), decimalStr("100000")).send(ctx.sendParam(lp))

      // trader buy and sell
      await ctx.DODO.methods.buyBaseToken(decimalStr("1000"), decimalStr("100000")).send(ctx.sendParam(trader))
      await ctx.DODO.methods.sellBaseToken(decimalStr("1000"), decimalStr("0")).send(ctx.sendParam(trader))

      // no profit or loss (may have precision problems)
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), "0")
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "9999999999999999999970000")
    })
  })
})