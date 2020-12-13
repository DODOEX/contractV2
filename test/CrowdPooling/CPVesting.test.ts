/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, MAX_UINT256 } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { CPContext, CPContextInitConfig } from '../utils/CrowdPoolingContext';
import BigNumber from 'bignumber.js';
import { assert } from 'chai';
import { DVM_NAME, getContractWithAddress } from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';
const truffleAssert = require('truffle-assertions');

let bidder1: string;
let bidder2: string;
let config: CPContextInitConfig

async function init(ctx: CPContext): Promise<void> {
  bidder1 = ctx.SpareAccounts[1]
  bidder2 = ctx.SpareAccounts[2]
}

describe("Funding", () => {
  let snapshotId: string;
  let ctx: CPContext;

  before(async () => {
    config = {
      totalBase: decimalStr("10000"),
      poolQuoteCap: decimalStr("50000"),
      ownerQuoteRatio: decimalStr("0.1"),
      k: decimalStr("0.5"),
      i: decimalStr("10"),
      lpFeeRate: decimalStr("0.002"),
      bidDuration: new BigNumber(86400),
      calmDuration: new BigNumber(86400),
      freezeDuration: new BigNumber(86400),
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

      await ctx.QUOTE.methods.mint(ctx.CP.options.address, decimalStr("10000")).send(ctx.sendParam(ctx.Deployer))
      await ctx.CP.methods.bid(bidder1).send(ctx.sendParam(bidder1))
      await ctx.QUOTE.methods.mint(ctx.CP.options.address, decimalStr("20000")).send(ctx.sendParam(ctx.Deployer))
      await ctx.CP.methods.bid(bidder2).send(ctx.sendParam(bidder2))

      await ctx.EVM.increaseTime(86400 * 2)

      await logGas(ctx.CP.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")

      assert.equal(await ctx.BASE.methods.balanceOf(ctx.CP.options.address).call(), "2557555139280633184959")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.CP.options.address).call(), "0")

      await ctx.CP.methods.claimBase().send(ctx.sendParam(bidder1))
      await ctx.CP.methods.claimQuote().send(ctx.sendParam(bidder1))
      assert.equal(await ctx.BASE.methods.balanceOf(bidder1).call(), "852518379760211061653")
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), "0")

      await ctx.CP.methods.claimBase().send(ctx.sendParam(bidder2))
      await ctx.CP.methods.claimQuote().send(ctx.sendParam(bidder2))
      assert.equal(await ctx.BASE.methods.balanceOf(bidder2).call(), "1705036759520422123306")
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder2).call(), "0")

    })

    it("bid exceed cap", async () => {
      await ctx.QUOTE.methods.mint(ctx.CP.options.address, decimalStr("30000")).send(ctx.sendParam(ctx.Deployer))
      await ctx.CP.methods.bid(bidder1).send(ctx.sendParam(bidder1))
      await ctx.QUOTE.methods.mint(ctx.CP.options.address, decimalStr("60000")).send(ctx.sendParam(ctx.Deployer))
      await ctx.CP.methods.bid(bidder2).send(ctx.sendParam(bidder2))

      await ctx.EVM.increaseTime(86400 * 2)

      await logGas(ctx.CP.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")

      assert.equal(await ctx.BASE.methods.balanceOf(ctx.CP.options.address).call(), "3819660112501051517955")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.CP.options.address).call(), decimalStr("39910"))

      await ctx.CP.methods.claimBase().send(ctx.sendParam(bidder1))
      await ctx.CP.methods.claimQuote().send(ctx.sendParam(bidder1))
      assert.equal(await ctx.BASE.methods.balanceOf(bidder1).call(), "1273220037500350505985")
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), "13303333333333333333333")

      await ctx.CP.methods.claimBase().send(ctx.sendParam(bidder2))
      await ctx.CP.methods.claimQuote().send(ctx.sendParam(bidder2))
      assert.equal(await ctx.BASE.methods.balanceOf(bidder2).call(), "2546440075000701011970")
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder2).call(), "26606666666666666666666")
    })

    it("withdraw lp token", async () => {
      await ctx.QUOTE.methods.mint(ctx.CP.options.address, decimalStr("30000")).send(ctx.sendParam(ctx.Deployer))
      await ctx.CP.methods.bid(bidder1).send(ctx.sendParam(bidder1))
      await ctx.QUOTE.methods.mint(ctx.CP.options.address, decimalStr("60000")).send(ctx.sendParam(ctx.Deployer))
      await ctx.CP.methods.bid(bidder2).send(ctx.sendParam(bidder2))

      await ctx.EVM.increaseTime(86400 * 2)
      await logGas(ctx.CP.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")
      await truffleAssert.reverts(ctx.CP.methods.claimLPToken().send(ctx.sendParam(ctx.Deployer)), "FREEZED")

      await ctx.EVM.increaseTime(86400)
      await ctx.CP.methods.claimLPToken().send(ctx.sendParam(ctx.Deployer))

      var poolAddress = await ctx.CP.methods._POOL_().call()
      var pool = getContractWithAddress(DVM_NAME, poolAddress)

      await pool.methods.sellShares("6180339887498948482045", bidder1, 0, 0, "0x", MAX_UINT256).send(ctx.sendParam(ctx.Deployer))
      assert.equal(await ctx.BASE.methods.balanceOf(bidder1).call(), "6180339887498948482045")
      assert.equal(await ctx.QUOTE.methods.balanceOf(bidder1).call(), "45000000000000000000000")

      assert.equal(await ctx.BASE.methods.balanceOf(poolAddress).call(), "0")
      assert.equal(await ctx.QUOTE.methods.balanceOf(poolAddress).call(), "0")
    })

  })
})