/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr } from '../utils/Converter';
// import { logGas } from '../utils/Log';
import { CPContext, CPContextInitConfig } from '../utils/CrowdPoolingContext';
// import { assert } from 'chai';
import BigNumber from 'bignumber.js';
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
      poolBaseReserve: decimalStr("5000"),
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

  describe("bid & cancel", () => {

    it("bid", async () => {
      await ctx.QUOTE.methods.transfer(ctx.CP.options.address, decimalStr("100")).send(ctx.sendParam(bidder1))
      await ctx.CP.methods.bid(bidder1).send(ctx.sendParam(bidder1))
    })
  })
})