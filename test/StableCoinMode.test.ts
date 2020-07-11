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
  await ctx.setOraclePrice(decimalStr("1"))

  lp = ctx.spareAccounts[0]
  trader = ctx.spareAccounts[1]
  await ctx.approveDODO(lp)
  await ctx.approveDODO(trader)

  await ctx.mintTestToken(lp, decimalStr("10000"), decimalStr("10000"))
  await ctx.mintTestToken(trader, decimalStr("10000"), decimalStr("10000"))

  await ctx.DODO.methods.depositBase(decimalStr("10000")).send(ctx.sendParam(lp))
  await ctx.DODO.methods.depositQuote(decimalStr("10000")).send(ctx.sendParam(lp))
}

describe("Trader", () => {

  let snapshotId: string
  let ctx: DODOContext

  before(async () => {
    let dodoContextInitConfig = {
      lpFeeRate: decimalStr("0.0001"),
      mtFeeRate: decimalStr("0"),
      k: gweiStr("1"), // nearly zero
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

  describe("Trade stable coin", () => {
    it("trade with tiny slippage", async () => {
      // 10% depth avg price 1.000100000111135
      await ctx.DODO.methods.buyBaseToken(decimalStr("1000"), decimalStr("1001")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("11000"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "8999899999888865431655")

      // 99.9% depth avg price 1.00010109
      await ctx.DODO.methods.buyBaseToken(decimalStr("8990"), decimalStr("10000")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("19990"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "8990031967806921648")

      // sell to 99.9% depth avg price 0.9999
      await ctx.DODO.methods.sellBaseToken(decimalStr("19980"), decimalStr("19970")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("10"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "19986992950440794518402")
    })

    it("huge sell trading amount", async () => {
      // trader could sell any number of base token
      // but the price will drop quickly
      await ctx.mintTestToken(trader, decimalStr("10000"), decimalStr("0"))
      await ctx.DODO.methods.sellBaseToken(decimalStr("20000"), decimalStr("0")).send(ctx.sendParam(trader))

      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("0"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "19998999990001000029997")
    })

    it("huge buy trading amount", async () => {
      // could not buy all base balance
      await assert.rejects(
        ctx.DODO.methods.buyBaseToken(decimalStr("10000"), decimalStr("10010")).send(ctx.sendParam(trader)),
        /DODO_BASE_TOKEN_BALANCE_NOT_ENOUGH/
      )

      // when buy amount close to base balance, price will increase quickly
      await ctx.mintTestToken(trader, decimalStr("0"), decimalStr("10000"))
      await ctx.DODO.methods.buyBaseToken(decimalStr("9999"), decimalStr("20000")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("19999"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "9000000119999999900000")
    })

    it("tiny withdraw penalty", async () => {
      await ctx.DODO.methods.buyBaseToken(decimalStr("9990"), decimalStr("10000")).send(ctx.sendParam(trader))

      // penalty only 0.2% even if withdraw make pool utilization rate raise to 99.5%
      assert.equal(await ctx.DODO.methods.getWithdrawBasePenalty(decimalStr("5")).call(), "9981967500000000")
    })
  })
})