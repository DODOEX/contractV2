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

    it("get addresses", async () => {

      var tempAddress = ctx.SpareAccounts[0]

      assert.equal(await ctx.DPP.methods._MAINTAINER_().call(), tempAddress)

    });

  });
});
