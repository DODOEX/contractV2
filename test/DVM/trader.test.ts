/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';

let lp: string;
let trader: string;

async function init(ctx: DVMContext): Promise<void> {
  lp = ctx.SpareAccounts[0];
  trader = ctx.SpareAccounts[1];
  await ctx.approveRoute(lp);
  await ctx.approveRoute(trader);

  await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"));
  await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"));

  await ctx.Route.methods
    .depositToDVM(ctx.DVM.options.address, lp, decimalStr("10"), decimalStr("0"))
    .send(ctx.sendParam(lp));

  console.log(await ctx.Vault.methods.getVaultBalance().call())

  console.log("deposit")
}

describe("Trader", () => {
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

  describe("trade", () => {
    it("buy & sell", async () => {

      console.log("BASE0 before buy", await ctx.DVM.methods._BASE0_().call())

      // buy
      await logGas(ctx.Route.methods.sellQuoteOnDVM(ctx.DVM.options.address, trader, decimalStr("200"), decimalStr("1")), ctx.sendParam(trader), "buy base token")
      console.log("BASE0 after buy", await ctx.DVM.methods._BASE0_().call())
      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "11946763594380080787"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        decimalStr("800")
      );
      // vault balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Vault.options.address).call(),
        "8051283784161162863"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Vault.options.address).call(),
        decimalStr("200")
      );
      // maintainer balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(),
        "1952621458756350"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(),
        decimalStr("0")
      );

      // sell
      await logGas(ctx.Route.methods.sellBaseOnDVM(ctx.DVM.options.address, trader, decimalStr("1"), decimalStr("100")), ctx.sendParam(trader), "sell base token")
      console.log("BASE0 after sell", await ctx.DVM.methods._BASE0_().call())
      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "10946763594380080787"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "903421810640399874603"
      );
      // vault balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Vault.options.address).call(),
        "9051283784161162863"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Vault.options.address).call(),
        "96474456349930717298"
      );
      // maintainer balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(),
        "1952621458756350"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(),
        "103733009669408099"
      );
    });
  });
});
