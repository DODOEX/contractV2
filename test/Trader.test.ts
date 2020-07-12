/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { DODOContext, getDODOContext } from './utils/Context';
import { decimalStr } from './utils/Converter';
import { logGas } from './utils/Log';
import * as assert from "assert"

let lp: string
let trader: string

async function init(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(decimalStr("100"))

  lp = ctx.spareAccounts[0]
  trader = ctx.spareAccounts[1]
  await ctx.approveDODO(lp)
  await ctx.approveDODO(trader)

  await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"))
  await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"))

  await ctx.DODO.methods.depositBase(decimalStr("10")).send(ctx.sendParam(lp))
  await ctx.DODO.methods.depositQuote(decimalStr("1000")).send(ctx.sendParam(lp))
}

describe("Trader", () => {

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

  describe("R goes above ONE", () => {
    it("buy when R equals ONE", async () => {
      logGas(await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("110")).send(ctx.sendParam(trader)), "buy base token when balanced")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("11"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "898581839502056240973")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0.001"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0"))
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("8.999"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "1101418160497943759027")
      // price update
      assert.equal(await ctx.DODO.methods.getMidPrice().call(), "102353368821735563400")
    })

    it("buy when R is ABOVE ONE", async () => {
      await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("110")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("130")).send(ctx.sendParam(trader)), "buy when R is ABOVE ONE")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("12"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "794367183433412077653")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0.002"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0"))
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("7.998"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "1205632816566587922347")
    })

    it("sell when R is ABOVE ONE", async () => {
      await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("110")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.sellBaseToken(decimalStr("0.5"), decimalStr("40")).send(ctx.sendParam(trader)), "sell when R is ABOVE ONE")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("10.5"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "949280846351657143136")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0.001"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "50851561534203512")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("9.499"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "1050668302086808653352")
    })

    it("sell when R is ABOVE ONE and RStatus back to ONE", async () => {
      await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("110")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.sellBaseToken("1003002430889317763", decimalStr("90")).send(ctx.sendParam(trader)), "sell when R is ABOVE ONE and RStatus back to ONE")
      // R status
      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "0")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), "9996997569110682237")
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "999695745518506168723")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0.001"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "101418160497943759")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), "10002002430889317763")
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "1000202836320995887518")
      // target status
      assert.equal(await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(), "10002002430889317763")
      assert.equal(await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(), "1000202836320995887518")
    })

    it("sell when R is ABOVE ONE and RStatus becomes BELOW ONE", async () => {
      await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("110")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.sellBaseToken(decimalStr("2"), decimalStr("90")).send(ctx.sendParam(trader)), "sell when R is ABOVE ONE and RStatus becomes BELOW ONE [gas cost worst case]")
      // R status
      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "2")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("9"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1098020621600061709144")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0.001"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "200038898794388634")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("10.999"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "901779339501143902222")
      // target status
      assert.equal(await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(), "10002002430889317763")
      assert.equal(await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(), "1000400077797588777268")
    })
  })

  describe("R goes below ONE", () => {
    it("sell when R equals ONE", async () => {
      logGas(await ctx.DODO.methods.sellBaseToken(decimalStr("1"), decimalStr("90")).send(ctx.sendParam(trader)), "sell base token when balanced")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("9"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1098617454226610630663")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), "0")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "98914196817061816")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("11"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "901283631576572307521")
      // price update
      assert.equal(await ctx.DODO.methods.getMidPrice().call(), "97736983274307939149")
    })

    it("sell when R is BELOW ONE", async () => {
      await ctx.DODO.methods.sellBaseToken(decimalStr("3"), decimalStr("90")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.sellBaseToken(decimalStr("3"), decimalStr("90")).send(ctx.sendParam(trader)), "sell when R is BELOW ONE")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("4"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1535961012052716726151")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), "0")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "537573733252474148")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("16"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "463501414214030799701")
    })

    it("buy when R is BELOW ONE", async () => {
      await ctx.DODO.methods.sellBaseToken(decimalStr("1"), decimalStr("90")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.buyBaseToken(decimalStr("0.5"), decimalStr("60")).send(ctx.sendParam(trader)), "buy when R is BELOW ONE")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("9.5"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1049294316148665165453")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0.0005"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "98914196817061816")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("10.4995"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "950606769654517772731")
    })

    it("buy when R is BELOW ONE and RStatus back to ONE", async () => {
      await ctx.DODO.methods.sellBaseToken(decimalStr("1"), decimalStr("90")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.buyBaseToken("997008973080757728", decimalStr("110")).send(ctx.sendParam(trader)), "buy when R is BELOW ONE and RStatus back to ONE")
      // R status
      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "0")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), "9997008973080757728")
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "999703024198699411500")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), "997008973080757")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "98914196817061816")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), "10001994017946161515")
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "1000198061604483526684")
      // target status
      assert.equal(await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(), "10001994017946161515")
      assert.equal(await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(), "1000198061604483526684")
    })

    it("buy when R is BELOW ONE and RStatus becomes ABOVE ONE", async () => {
      await ctx.DODO.methods.sellBaseToken(decimalStr("1"), decimalStr("90")).send(ctx.sendParam(trader))
      logGas(await ctx.DODO.methods.buyBaseToken(decimalStr("2"), decimalStr("220")).send(ctx.sendParam(trader)), "buy when R is BELOW ONE and RStatus becomes ABOVE ONE [gas cost worst case]")
      // R status
      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "1")
      // trader balances
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("11"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "897977789597854403796")
      // maintainer balances
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0.002"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), "98914196817061816")
      // dodo balances
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("8.998"))
      assert.equal(await ctx.DODO.methods._QUOTE_BALANCE_().call(), "1101923296205328534388")
      // target status
      assert.equal(await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(), "10004000000000000000")
      assert.equal(await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(), "1000198061604483526684")
    })
  })

  describe("Corner cases", () => {
    it("buy or sell 0", async () => {
      await ctx.DODO.methods.sellBaseToken(decimalStr("0"), decimalStr("0")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("10"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), decimalStr("1000"))

      await ctx.DODO.methods.buyBaseToken(decimalStr("0"), decimalStr("0")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), decimalStr("10"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), decimalStr("1000"))
    })

    it("buy or sell a tiny amount", async () => {
      // no precision problem
      await ctx.DODO.methods.sellBaseToken("1", decimalStr("0")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), "9999999999999999999")
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1000000000000000000100")

      // have precision problem, charge 0
      await ctx.DODO.methods.buyBaseToken("1", decimalStr("1")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), "10000000000000000000")
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1000000000000000000100")
      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "0")

      // no precision problem if trading amount is extremely small
      await ctx.DODO.methods.buyBaseToken("10", decimalStr("1")).send(ctx.sendParam(trader))
      assert.equal(await ctx.BASE.methods.balanceOf(trader).call(), "10000000000000000010")
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "999999999999999999100")
    })

    it("sell a huge amount of base token", async () => {
      await ctx.mintTestToken(trader, decimalStr("10000"), "0")
      await ctx.DODO.methods.sellBaseToken(decimalStr("10000"), "0").send(ctx.sendParam(trader))
      // nearly drain out quote pool
      // because the fee donated is greater than remaining quote pool
      // quote lp earn a considerable profit
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1996900220185135480813")
      assert.equal(await ctx.DODO.methods.getLpQuoteBalance(lp).call(), "4574057156329524019750")
    })
  })

  describe("Revert cases", () => {
    it("price limit", async () => {
      await assert.rejects(
        ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("100")).send(ctx.sendParam(trader)),
        /BUY_BASE_COST_TOO_MUCH/
      )
      await assert.rejects(
        ctx.DODO.methods.sellBaseToken(decimalStr("1"), decimalStr("100")).send(ctx.sendParam(trader)),
        /SELL_BASE_RECEIVE_NOT_ENOUGH/
      )
    })

    it("base balance limit", async () => {
      await assert.rejects(
        ctx.DODO.methods.buyBaseToken(decimalStr("11"), decimalStr("10000")).send(ctx.sendParam(trader)),
        /DODO_BASE_BALANCE_NOT_ENOUGH/
      )

      await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("200")).send(ctx.sendParam(trader))

      await assert.rejects(
        ctx.DODO.methods.buyBaseToken(decimalStr("11"), decimalStr("10000")).send(ctx.sendParam(trader)),
        /DODO_BASE_BALANCE_NOT_ENOUGH/
      )
    })
  })
})