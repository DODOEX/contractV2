/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr } from '../utils/Converter';
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
  await ctx.QUOTE.methods.mint(bidder1, decimalStr("1000")).send(ctx.sendParam(ctx.Deployer))
  await ctx.QUOTE.methods.mint(bidder2, decimalStr("1000")).send(ctx.sendParam(ctx.Deployer))
}

describe("Funding", () => {
  let snapshotId: string;
  let ctx: CPContext;

  before(async () => {
    config = {
      totalBase: decimalStr("10000"),
      poolQuoteCap: decimalStr("50000"),
      k: decimalStr("0"),
      i: decimalStr("10"),
      lpFeeRate: decimalStr("0.002"),
      bidDuration: new BigNumber(86400),
      calmDuration: new BigNumber(86400),
      freezeDuration: new BigNumber(86400),
      vestingDuration: new BigNumber(86400),
      cliffRate: decimalStr("1"),
      quoteTokenContract:"",
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

  describe("bid & cancel", () => {

    it("bid and cancel", async () => {
      await ctx.QUOTE.methods.transfer(ctx.CP.options.address, decimalStr("100")).send(ctx.sendParam(bidder1))
      await logGas(ctx.CP.methods.bid(bidder1), ctx.sendParam(bidder1), "bid")
      assert.equal(await ctx.CP.methods.getShares(bidder1).call(), decimalStr("100"))
      assert.equal(await ctx.CP.methods._TOTAL_SHARES_().call(), decimalStr("100"))
	  assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0"))
	  
      await ctx.QUOTE.methods.transfer(ctx.CP.options.address, decimalStr("50")).send(ctx.sendParam(bidder2))
      await ctx.CP.methods.bid(bidder2).send(ctx.sendParam(bidder2))
      assert.equal(await ctx.CP.methods.getShares(bidder2).call(), decimalStr("50"))
      assert.equal(await ctx.CP.methods._TOTAL_SHARES_().call(), decimalStr("150"))
	  assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(), decimalStr("0"))
	  
      await ctx.EVM.increaseTime(86400)
      await logGas(ctx.CP.methods.cancel(bidder1, decimalStr("20"),"0x"), ctx.sendParam(bidder1), "cancel")
      assert.equal(await ctx.CP.methods.getShares(bidder1).call(), decimalStr("80"))
      assert.equal(await ctx.CP.methods._TOTAL_SHARES_().call(), decimalStr("130"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), decimalStr("920"))

    })

  })
})
