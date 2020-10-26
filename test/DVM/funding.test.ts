/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';
import BigNumber from 'bignumber.js';

let lp: string;
let trader: string;

async function init(ctx: DVMContext): Promise<void> {
  lp = ctx.SpareAccounts[0];
  trader = ctx.SpareAccounts[1];
  await ctx.approveRoute(lp);
  await ctx.approveRoute(trader);

  await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"));
  await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"));
}

describe("Funding", () => {
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

  describe("buy shares", () => {

    it("buy shares from init states", async () => {

      await logGas(ctx.Route.methods
        .depositToDVM(ctx.DVM.options.address, lp, decimalStr("10"), decimalStr("0"))
        , ctx.sendParam(lp), "buy shares");

      // vault balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Vault.options.address).call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Vault.options.address).call(),
        decimalStr("0")
      );
      assert.equal(
        await ctx.Vault.methods._BASE_RESERVE_().call(),
        decimalStr("10")
      )
      assert.equal(
        await ctx.Vault.methods._QUOTE_RESERVE_().call(),
        decimalStr("0")
      )

      // shares number
      assert.equal(await ctx.Vault.methods.balanceOf(lp).call(), decimalStr("10"))
    });

    it("buy shares from init states with quote != 0", async () => {
      await ctx.Route.methods
        .depositToDVM(ctx.DVM.options.address, lp, decimalStr("10"), decimalStr("100"))
        .send(ctx.sendParam(lp));
      assert.equal(await ctx.Vault.methods.balanceOf(lp).call(), decimalStr("10"))
      assert.equal(await ctx.DVM.methods.getMidPrice().call(), "102078438912577213500")
    })

    it("buy shares with balanced input", async () => {
      await ctx.Route.methods
        .depositToDVM(ctx.DVM.options.address, lp, decimalStr("10"), decimalStr("0"))
        .send(ctx.sendParam(lp));
      await ctx.Route.methods.sellQuoteOnDVM(ctx.DVM.options.address, trader, decimalStr("200"), decimalStr("1")).send(ctx.sendParam(trader))

      var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.Vault.options.address).call())
      var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.Vault.options.address).call())
      var increaseRatio = new BigNumber("0.1")

      await ctx.Route.methods.depositToDVM(ctx.DVM.options.address, trader, vaultBaseBalance.multipliedBy(increaseRatio).toFixed(0), vaultQuoteBalance.multipliedBy(increaseRatio).toFixed(0)).send(ctx.sendParam(trader))

      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Vault.options.address).call(),
        "8856412162577279149"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Vault.options.address).call(),
        "219999999999999999800"
      );

      assert.equal(await ctx.Vault.methods.balanceOf(trader).call(), "999999999999999990")
    })

    it("buy shares with unbalanced input (less quote)", async () => {
      await ctx.Route.methods
        .depositToDVM(ctx.DVM.options.address, lp, decimalStr("10"), decimalStr("0"))
        .send(ctx.sendParam(lp));
      await ctx.Route.methods.sellQuoteOnDVM(ctx.DVM.options.address, trader, decimalStr("200"), decimalStr("1")).send(ctx.sendParam(trader))

      var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.Vault.options.address).call())
      var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.Vault.options.address).call())
      var increaseRatio = new BigNumber("0.1")
      await ctx.Route.methods.depositToDVM(
        ctx.DVM.options.address,
        trader,
        vaultBaseBalance.multipliedBy(increaseRatio).toFixed(0),
        vaultQuoteBalance.multipliedBy(increaseRatio).div(2).toFixed(0)
      ).send(ctx.sendParam(trader))
      assert.equal(await ctx.Vault.methods.balanceOf(trader).call(), "499999999999999990")
    })

    it("buy shares with unbalanced input (less base)", async () => {
      await ctx.Route.methods
        .depositToDVM(ctx.DVM.options.address, lp, decimalStr("10"), decimalStr("0"))
        .send(ctx.sendParam(lp));
      await ctx.Route.methods.sellQuoteOnDVM(ctx.DVM.options.address, trader, decimalStr("200"), decimalStr("1")).send(ctx.sendParam(trader))

      var vaultBaseBalance = new BigNumber(await ctx.BASE.methods.balanceOf(ctx.Vault.options.address).call())
      var vaultQuoteBalance = new BigNumber(await ctx.QUOTE.methods.balanceOf(ctx.Vault.options.address).call())
      var increaseRatio = new BigNumber("0.1")
      await ctx.Route.methods.depositToDVM(
        ctx.DVM.options.address,
        trader,
        vaultBaseBalance.multipliedBy(increaseRatio).div(2).toFixed(0),
        vaultQuoteBalance.multipliedBy(increaseRatio).toFixed(0)
      ).send(ctx.sendParam(trader))
      assert.equal(await ctx.Vault.methods.balanceOf(trader).call(), "499999999999999990")
    })
  });
});
