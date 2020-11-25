/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';
const truffleAssert = require('truffle-assertions');

async function init(ctx: DVMContext): Promise<void> { }

describe("Admin Set", () => {
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

  describe("setting", () => {

    it("set addresses", async () => {

      var tempAddress = ctx.SpareAccounts[0]

      await ctx.DVM.methods.setLpFeeRateModel(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DVM.methods.setMtFeeRateModel(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DVM.methods.setTradePermissionManager(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DVM.methods.setMaintainer(tempAddress).send(ctx.sendParam(ctx.Deployer))
      await ctx.DVM.methods.setGasPriceSource(tempAddress).send(ctx.sendParam(ctx.Deployer))

      assert.equal(await ctx.DVM.methods._LP_FEE_RATE_MODEL_().call(), tempAddress)
      assert.equal(await ctx.DVM.methods._MT_FEE_RATE_MODEL_().call(), tempAddress)
      assert.equal(await ctx.DVM.methods._TRADE_PERMISSION_().call(), tempAddress)
      assert.equal(await ctx.DVM.methods._MAINTAINER_().call(), tempAddress)
      assert.equal(await ctx.DVM.methods._GAS_PRICE_LIMIT_().call(), tempAddress)

    });

    it("set buy sell", async () => {
      await ctx.DVM.methods.setBuy(false).send(ctx.sendParam(ctx.Deployer))
      await ctx.DVM.methods.setSell(false).send(ctx.sendParam(ctx.Deployer))

      await truffleAssert.reverts(ctx.DVM.methods.sellQuote(ctx.Deployer).send(ctx.sendParam(ctx.Deployer)), "TRADER_BUY_NOT_ALLOWED")

      await truffleAssert.reverts(ctx.DVM.methods.sellBase(ctx.Deployer).send(ctx.sendParam(ctx.Deployer)), "TRADER_SELL_NOT_ALLOWED")
    })

  });
});