/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { DPPContext, getDPPContext } from '../utils/DPPContext';
import { assert } from 'chai';
const truffleAssert = require('truffle-assertions');

async function init(ctx: DPPContext): Promise<void> { }

describe("Admin Set", () => {
  let snapshotId: string;
  let ctx: DPPContext;

  before(async () => {
    ctx = await getDPPContext();
    await init(ctx);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("setting", () => {

    it("set addresses", async () => {

      var tempAddress = ctx.SpareAccounts[0]

      await ctx.DPP.methods.setLpFeeRateModel(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.setMtFeeRateModel(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.setTradePermissionManager(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.setMaintainer(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.setGasPriceSource(tempAddress).send(ctx.sendParam(ctx.Deployer))

      assert.equal(await ctx.DPP.methods._LP_FEE_RATE_MODEL_().call(), tempAddress)
      assert.equal(await ctx.DPP.methods._MT_FEE_RATE_MODEL_().call(), tempAddress)
      assert.equal(await ctx.DPP.methods._TRADE_PERMISSION_().call(), tempAddress)
      assert.equal(await ctx.DPP.methods._MAINTAINER_().call(), tempAddress)
      assert.equal(await ctx.DPP.methods._GAS_PRICE_LIMIT_().call(), tempAddress)

    });

    it("set buy sell", async () => {
      await ctx.DPP.methods.setBuy(false).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.setSell(false).send(ctx.sendParam(ctx.Deployer))

      await truffleAssert.reverts(ctx.DPP.methods.sellQuote(ctx.Deployer).send(ctx.sendParam(ctx.Deployer)), "TRADER_BUY_NOT_ALLOWED")

      await truffleAssert.reverts(ctx.DPP.methods.sellBase(ctx.Deployer).send(ctx.sendParam(ctx.Deployer)), "TRADER_SELL_NOT_ALLOWED")
    })

  });
});