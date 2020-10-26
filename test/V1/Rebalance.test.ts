/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import * as assert from 'assert';
import { Contract } from 'web3-eth-contract';

import { DODOContext, getDODOContext } from './utils/DVMContext';
import { DODO_REBALANCER_NAME, newContract } from './utils/Contracts';
import { decimalStr } from './utils/Converter';

let lp: string;
let trader: string;
let rebalancer: Contract;

async function init(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(decimalStr("100"));

  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];
  await ctx.approveDODO(lp);
  await ctx.approveDODO(trader);

  await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"));
  await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"));

  await ctx.DODO.methods
    .depositBaseTo(lp, decimalStr("10"))
    .send(ctx.sendParam(lp));
  await ctx.DODO.methods
    .depositQuoteTo(lp, decimalStr("1000"))
    .send(ctx.sendParam(lp));

  rebalancer = await newContract(DODO_REBALANCER_NAME)
}

describe("Trader", () => {
  let snapshotId: string;
  let ctx: DODOContext;

  before(async () => {
    ctx = await getDODOContext();
    await init(ctx);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("rebalance", () => {
    it("R above ONE rebalance", async () => {
      await ctx.DODO.methods.buyBaseToken(decimalStr("1"), decimalStr("110"), "0x").send(ctx.sendParam(trader))
      await ctx.DODO.methods.disableTrading().send(ctx.sendParam(ctx.Deployer))
      await ctx.DODO.methods.transferOwnership(rebalancer.options.address).send(ctx.sendParam(ctx.Deployer))
      await rebalancer.methods.claimOwnership(ctx.DODO.options.address).send(ctx.sendParam(ctx.Deployer))

      await ctx.BASE.methods.transfer(rebalancer.options.address, decimalStr("2")).send(ctx.sendParam(trader))
      await rebalancer.methods.rebalance(ctx.DODO.options.address).send(ctx.sendParam(ctx.Deployer));

      assert.equal(await ctx.DODO.methods.getMidPrice().call(), await ctx.DODO.methods.getOraclePrice().call())

      await rebalancer.methods.transferOwnership(ctx.DODO.options.address, ctx.Deployer).send(ctx.sendParam(ctx.Deployer))
      await ctx.DODO.methods.claimOwnership().send(ctx.sendParam(ctx.Deployer))

      await rebalancer.methods.retrieve(ctx.BASE.options.address).send(ctx.sendParam(ctx.Deployer))
      await rebalancer.methods.retrieve(ctx.QUOTE.options.address).send(ctx.sendParam(ctx.Deployer))

      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Deployer).call(), "996997569110682237")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Deployer).call(), "101113906016449927750")
    });

    it("R below ONE rebalance", async () => {
      await ctx.DODO.methods.sellBaseToken(decimalStr("1"), decimalStr("90"), "0x").send(ctx.sendParam(trader))
      await ctx.DODO.methods.disableTrading().send(ctx.sendParam(ctx.Deployer))
      await ctx.DODO.methods.transferOwnership(rebalancer.options.address).send(ctx.sendParam(ctx.Deployer))
      await rebalancer.methods.claimOwnership(ctx.DODO.options.address).send(ctx.sendParam(ctx.Deployer))

      await ctx.QUOTE.methods.transfer(rebalancer.options.address, decimalStr("200")).send(ctx.sendParam(trader))
      await rebalancer.methods.rebalance(ctx.DODO.options.address).send(ctx.sendParam(ctx.Deployer));

      assert.equal(await ctx.DODO.methods.getMidPrice().call(), await ctx.DODO.methods.getOraclePrice().call())

      await rebalancer.methods.transferOwnership(ctx.DODO.options.address, ctx.Deployer).send(ctx.sendParam(ctx.Deployer))
      await ctx.DODO.methods.claimOwnership().send(ctx.sendParam(ctx.Deployer))

      await rebalancer.methods.retrieve(ctx.BASE.options.address).send(ctx.sendParam(ctx.Deployer))
      await rebalancer.methods.retrieve(ctx.QUOTE.options.address).send(ctx.sendParam(ctx.Deployer))

      assert.equal(await ctx.BASE.methods.balanceOf(ctx.Deployer).call(), "997008973080757726")
      assert.equal(await ctx.QUOTE.methods.balanceOf(ctx.Deployer).call(), "101085569972088780856")
    });

  });
});
