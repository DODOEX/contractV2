/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { CPContext, CPContextInitConfig } from '../utils/CrowdPoolingContext';
import BigNumber from 'bignumber.js';
import { assert } from 'chai';
import { DVM_NAME, getContractWithAddress } from '../utils/Contracts';
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
      quoteTokenContract:'',
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

  describe("settle", () => {

    it("bid not exceed cap", async () => {
      await ctx.QUOTE.methods.transfer(ctx.CP.options.address, decimalStr("1000")).send(ctx.sendParam(bidder1))
      await ctx.CP.methods.bid(bidder1).send(ctx.sendParam(bidder1))

      await ctx.EVM.increaseTime(86400 * 2)
      await truffleAssert.reverts(ctx.CP.methods.bid(bidder1).send(ctx.sendParam(bidder1)), "NOT_PHASE_BID")

      await logGas(ctx.CP.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")
      assert.equal(await ctx.CP.methods._SETTLED_().call(), true)

      var poolAddress = await ctx.CP.methods._POOL_().call()
      var pool = getContractWithAddress(DVM_NAME, poolAddress)

      assert.equal(await pool.methods.getMidPrice().call(), "9999999999999999990")
      assert.equal(await ctx.CP.methods._AVG_SETTLED_PRICE_().call(), "10000000000000000000")

      assert.equal(await ctx.CP.methods._UNUSED_QUOTE_().call(), "0")
      assert.equal(await ctx.CP.methods._UNUSED_BASE_().call(), "100000000000000000000")

      assert.equal(await ctx.BASE.methods.balanceOf(poolAddress).call(), "9900000000000000000000")
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.CP.options.address).call(), "100000000000000000000")

      assert.equal(await ctx.QUOTE.methods.balanceOf(poolAddress).call(), decimalStr("1000"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.CP.options.address).call(), "0")
    })

    it("bid exceed cap", async () => {
      await ctx.QUOTE.methods.mint(ctx.CP.options.address, decimalStr("100000")).send(ctx.sendParam(ctx.Deployer))
      await ctx.CP.methods.bid(bidder1).send(ctx.sendParam(bidder1))

      await ctx.EVM.increaseTime(86400 * 2)

      await logGas(ctx.CP.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")
      assert.equal(await ctx.CP.methods._SETTLED_().call(), true)

      var poolAddress = await ctx.CP.methods._POOL_().call()
      var pool = getContractWithAddress(DVM_NAME, poolAddress)

      assert.equal(await pool.methods.getMidPrice().call(), "10000000003162277660")
      assert.equal(await ctx.CP.methods._AVG_SETTLED_PRICE_().call(), "10000000000000000000")

      assert.equal(await ctx.CP.methods._UNUSED_QUOTE_().call(), decimalStr("50000"))
      assert.equal(await ctx.CP.methods._UNUSED_BASE_().call(), "5000000000000000000000")

      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Deployer).call(), "0")
      assert.equal(await ctx.BASE.methods.balanceOf(poolAddress).call(), "5000000000000000000000")
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.CP.options.address).call(), "5000000000000000000000")

      assert.equal(await ctx.QUOTE.methods.balanceOf(poolAddress).call(), decimalStr("50000"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.CP.options.address).call(), decimalStr("50000"))
    })

    it("bid zero", async () => {
      await ctx.EVM.increaseTime(86400 * 2)

      await logGas(ctx.CP.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")

      var poolAddress = await ctx.CP.methods._POOL_().call()
      var pool = getContractWithAddress(DVM_NAME, poolAddress)

      assert.equal(await pool.methods.getMidPrice().call(), decimalStr("10"))
      assert.equal(await ctx.CP.methods._AVG_SETTLED_PRICE_().call(), decimalStr("10"))

      assert.equal(await ctx.CP.methods._UNUSED_QUOTE_().call(), "0")
      assert.equal(await ctx.CP.methods._UNUSED_BASE_().call(), "0")

      assert.equal(await ctx.BASE.methods.balanceOf(poolAddress).call(), decimalStr("10000"))
      assert.equal(await ctx.BASE.methods.balanceOf(ctx.CP.options.address).call(), "0")

      assert.equal(await ctx.QUOTE.methods.balanceOf(poolAddress).call(), "0")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.CP.options.address).call(), "0")
    })

  })
})
