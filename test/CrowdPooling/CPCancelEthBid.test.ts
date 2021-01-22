/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, mweiStr } from "../utils/Converter";
import { logGas } from '../utils/Log';
import { CPContext, CPContextInitConfig } from '../utils/CrowdPoolingContext';
import BigNumber from 'bignumber.js';
import { assert } from 'chai';
const truffleAssert = require('truffle-assertions');

let bidder1: string;
let bidder2: string;
let config: CPContextInitConfig

async function init(ctx: CPContext): Promise<void> {
  bidder1 = ctx.SpareAccounts[1]
  bidder2 = ctx.SpareAccounts[2]
  await ctx.QUOTE.methods.deposit().send(ctx.sendParam(bidder1,"0.1"))
  await ctx.QUOTE.methods.deposit().send(ctx.sendParam(bidder2,"0.5"))
}

describe("Funding", () => {
  let snapshotId: string;
  let ctx: CPContext;

  before(async () => {
    config = {
      totalBase: decimalStr("0.1"),
      poolQuoteCap: decimalStr("0.5"),
      k: decimalStr("0"),
      i: decimalStr("10"),
      lpFeeRate: decimalStr("0.002"),
      bidDuration: new BigNumber(86400),
      calmDuration: new BigNumber(86400),
      freezeDuration: new BigNumber(86400),
      vestingDuration: new BigNumber(86400),
      cliffRate: decimalStr("1"),
      quoteTokenContract:"WETH9",
      isOpenTWAP:true
    }
    ctx = new CPContext();
    await ctx.init(config);
    await init(ctx);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("eth bid & cancel", () => {

    it("cancel by callee contract", async () => {
      await ctx.QUOTE.methods.transfer(ctx.CP.options.address, decimalStr("0.1")).send(ctx.sendParam(bidder1))
      await logGas(ctx.CP.methods.bid(bidder1), ctx.sendParam(bidder1), "bidder1 bid")
      assert.equal(await ctx.CP.methods.getShares(bidder1).call(), decimalStr("0.1"))
      assert.equal(await ctx.CP.methods._TOTAL_SHARES_().call(), decimalStr("0.1"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), decimalStr("0"))

      await logGas(ctx.CP.methods.cancel(bidder1, decimalStr("0.05"),"0x"), ctx.sendParam(bidder1), "cancel and get 0.05 weth")
      assert.equal(await ctx.CP.methods.getShares(bidder1).call(), decimalStr("0.05"))
      assert.equal(await ctx.CP.methods._TOTAL_SHARES_().call(), decimalStr("0.05"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), decimalStr("0.05"))

      let beforeEthBalance = await ctx.Web3.eth.getBalance(bidder1);
      let receipt = await logGas(ctx.CP.methods.cancel(ctx.DODOCallee.options.address, decimalStr("0.02"),"0x00"), ctx.sendParam(bidder1), "cancel and get 0.02 eth")
      assert.equal(await ctx.CP.methods.getShares(bidder1).call(), decimalStr("0.03"))
      assert.equal(await ctx.CP.methods._TOTAL_SHARES_().call(), decimalStr("0.03"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), decimalStr("0.05"))
      let afterEthBalance = await ctx.Web3.eth.getBalance(bidder1);
      assert.equal(Number.parseInt(receipt["events"]["1"]["raw"]["data"],16),Number(decimalStr("0.02")));
      // assert.equal(Number(afterEthBalance) - Number(beforeEthBalance) + Number(receipt.gasUsed)*Number(mweiStr("1000")),Number(decimalStr("0.02")));

    })

    it("claim by callee contract", async () => {
      await ctx.QUOTE.methods.deposit().send(ctx.sendParam(bidder1,"0.4"))
      await ctx.QUOTE.methods.deposit().send(ctx.sendParam(bidder2,"0.5"))

      await ctx.QUOTE.methods.transfer(ctx.CP.options.address, decimalStr("0.5")).send(ctx.sendParam(bidder1))
      await logGas(ctx.CP.methods.bid(bidder1), ctx.sendParam(bidder1), "bidder1 bid")
      await ctx.QUOTE.methods.transfer(ctx.CP.options.address, decimalStr("0.5")).send(ctx.sendParam(bidder2))
      await logGas(ctx.CP.methods.bid(bidder2), ctx.sendParam(bidder2), "bidder2 bid")

      assert.equal(await ctx.CP.methods.getShares(bidder1).call(), decimalStr("0.5"))
      assert.equal(await ctx.CP.methods.getShares(bidder2).call(), decimalStr("0.5"))
      assert.equal(await ctx.CP.methods._TOTAL_SHARES_().call(), decimalStr("1"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.CP.options.address).call(), decimalStr("1"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), decimalStr("0"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder2).call(), decimalStr("0.5"))

      await ctx.EVM.increaseTime(86400 *2)
      await logGas(ctx.CP.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.CP.options.address).call(), decimalStr("0.5"))

      await ctx.EVM.increaseTime(86400 * 2)
      assert.equal(await ctx.BASE.methods.balanceOf(bidder1).call(), "0")
      let receipt1 = await logGas(await ctx.CP.methods.bidderClaim(bidder1,"0x"),ctx.sendParam(bidder1),"claim");
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), decimalStr("0.25"))

      let receipt2 = await logGas(await ctx.CP.methods.bidderClaim(ctx.DODOCallee.options.address,"0x00"),ctx.sendParam(bidder2),"claim");
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder2).call(), decimalStr("0.5"))
      assert.equal(Number.parseInt(receipt2["events"]["3"]["raw"]["data"],16),Number(decimalStr("0.25")));

    })

  })
})
