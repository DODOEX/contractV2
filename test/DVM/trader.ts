/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { DVM_VAULT_NAME, getContractWithAddress } from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';

let lp: string;
let trader: string;
let vault: Contract

async function init(ctx: DVMContext): Promise<void> {
  lp = ctx.SpareAccounts[0];
  trader = ctx.SpareAccounts[1];
  await ctx.approveRoute(lp);
  await ctx.approveRoute(trader);

  console.log("approve")

  await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"));
  await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"));

  console.log("mint")

  var vaultAddress = await ctx.DVM.methods._VAULT_().call();
  vault = getContractWithAddress(DVM_VAULT_NAME, vaultAddress)

  await ctx.Route.methods
    .depositToDVM(ctx.DVM.options.address, lp, decimalStr("10"), decimalStr("0"))
    .send(ctx.sendParam(lp));

  console.log(await vault.methods.getVaultBalance().call())

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
    it("buy when R equals ONE", async () => {
      await logGas(ctx.Route.methods.sellBaseOnDVM(ctx.DVM.options.address, trader, decimalStr("1"), decimalStr("90")), ctx.sendParam(trader), "buy base token when balanced")
      // trader balances
      console.log(
        await ctx.BASE.methods.balanceOf(trader).call(),
        decimalStr("11")
      );
      console.log(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "898581839502056240973"
      );
      // maintainer balances
      console.log(
        await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(),
        decimalStr("0.001")
      );
      console.log(
        await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(),
        decimalStr("0")
      );
    });
  });
});
