/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, mweiStr } from '../utils/Converter';
import { DPPContext, getDPPContext } from '../utils/DPPContext';
import { assert } from 'chai';
import { EXTERNAL_VALUE_NAME, getContractWithAddress, MINTABLE_ERC20_CONTRACT_NAME, newContract } from '../utils/Contracts';
// import { sendParam } from '../../script/utils';
const truffleAssert = require('truffle-assertions');

let lp: string;

async function init(ctx: DPPContext): Promise<void> {
  lp = ctx.Deployer

  await ctx.mintTestToken(lp, decimalStr("100"), decimalStr("10000"));

  var baseAmount = decimalStr("10")
  var quoteAmount = decimalStr("1000")
  var lpFeeRate = decimalStr("0.002")
  var mtFeeRate = decimalStr("0.001")
  var iValue = decimalStr("200")
  var kValue = decimalStr("0.2")
  await ctx.transferBaseToDPP(lp, baseAmount)
  await ctx.transferQuoteToDPP(lp, quoteAmount)
  await ctx.DPP.methods.reset(lp, lpFeeRate, iValue, kValue, "0", "0", "0", "0").send(ctx.sendParam(ctx.Deployer))
}

describe("DPP Reset", () => {
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

  describe("reset", () => {

    it("reset with asset input", async () => {

      var lpFeeRate = decimalStr("0.01")
      var iValue = decimalStr("300")
      var kValue = decimalStr("0.3")
      await ctx.transferBaseToDPP(lp, decimalStr("10"))
      await ctx.transferQuoteToDPP(lp, decimalStr("1000"))
      await ctx.DPP.methods.reset(lp, lpFeeRate, iValue, kValue, "0", "0", "0", "0").send(ctx.sendParam(ctx.Deployer))
      var state = await ctx.DPP.methods.getPMMState().call()
      assert.equal(state.B, decimalStr("20"))
      assert.equal(state.Q, decimalStr("2000"))
      assert.equal(state.B0, decimalStr("20"))
      assert.equal(state.Q0, decimalStr("2000"))
      assert.equal(state.i, iValue)
      assert.equal(state.K, kValue)

      var feeRate = await ctx.DPP.methods.getUserFeeRate(lp).call()
      assert.equal(feeRate[0], lpFeeRate)
    });

    it("reset with asset output", async () => {
      var lpFeeRate = decimalStr("0.01")
      var iValue = decimalStr("300")
      var kValue = decimalStr("0.3")
      await ctx.DPP.methods.reset(lp, lpFeeRate, iValue, kValue, decimalStr("1"), decimalStr("100"), "0", "0").send(ctx.sendParam(ctx.Deployer))

      var state = await ctx.DPP.methods.getPMMState().call()
      assert.equal(state.B, decimalStr("9"))
      assert.equal(state.Q, decimalStr("900"))
      assert.equal(state.B0, decimalStr("9"))
      assert.equal(state.Q0, decimalStr("900"))
      assert.equal(state.i, iValue)
      assert.equal(state.K, kValue)

      var feeRate = await ctx.DPP.methods.getUserFeeRate(lp).call()
      assert.equal(feeRate[0], lpFeeRate)
    })

    it("reset without asset input/output", async () => {
      var lpFeeRate = decimalStr("0.01")
      var iValue = decimalStr("300")
      var kValue = decimalStr("0.3")
      await ctx.DPP.methods.reset(lp, lpFeeRate, iValue, kValue, "0", "0", "0", "0").send(ctx.sendParam(ctx.Deployer))

      var state = await ctx.DPP.methods.getPMMState().call()
      assert.equal(state.B, decimalStr("10"))
      assert.equal(state.Q, decimalStr("1000"))
      assert.equal(state.B0, decimalStr("10"))
      assert.equal(state.Q0, decimalStr("1000"))
      assert.equal(state.i, iValue)
      assert.equal(state.K, kValue)

      var feeRate = await ctx.DPP.methods.getUserFeeRate(lp).call()
      assert.equal(feeRate[0], lpFeeRate)
    })

  });

  describe("retrieve", async () => {

    it("retrieve another token", async () => {
      var otherToken = await newContract(
        MINTABLE_ERC20_CONTRACT_NAME,
        ["Test", "TEST", 18]
      );
      await otherToken.methods.mint(ctx.DPP.options.address, decimalStr("10")).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.retrieve(ctx.Deployer, otherToken.options.address, decimalStr("10")).send(ctx.sendParam(ctx.Deployer))
      assert.equal(await otherToken.methods.balanceOf(ctx.DPP.options.address).call(), "0")
      assert.equal(await otherToken.methods.balanceOf(ctx.Deployer).call(), decimalStr("10"))
    })

  })

  describe("revert", async () => {
    it("can not retrieve base or quote", async () => {
      await truffleAssert.reverts(
        ctx.DPP.methods.retrieve(ctx.Deployer, ctx.BASE.options.address, decimalStr("1")).send(ctx.sendParam(ctx.Deployer)), "USE_RESET"
      )

      await truffleAssert.reverts(
        ctx.DPP.methods.retrieve(ctx.Deployer, ctx.QUOTE.options.address, decimalStr("1")).send(ctx.sendParam(ctx.Deployer)), "USE_RESET"
      )
    })

    it("i or k can not out of range", async () => {
      await truffleAssert.reverts(
        ctx.DPP.methods.reset(lp, "0", "0", decimalStr("1"), "0", "0", "0", "0").send(ctx.sendParam(ctx.Deployer)), "I_OUT_OF_RANGE"
      )
      await truffleAssert.reverts(
        ctx.DPP.methods.reset(lp, "0", "10000000000000000000000000000000000000", decimalStr("1"), "0", "0", "0", "0").send(ctx.sendParam(ctx.Deployer)), "I_OUT_OF_RANGE"
      )
      await truffleAssert.reverts(
        ctx.DPP.methods.reset(lp, "0", decimalStr("1"), decimalStr("2"), "0", "0", "0", "0").send(ctx.sendParam(ctx.Deployer)), "K_OUT_OF_RANGE"
      )
    })

    it("revert if someone trade before reset", async () => {
      var baseReserve = await ctx.DPP.methods._BASE_RESERVE_().call()
      var quoteReserve = await ctx.DPP.methods._QUOTE_RESERVE_().call()

      await ctx.BASE.methods.mint(ctx.DPP.options.address, decimalStr("1")).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.sellBase(ctx.Deployer).send(ctx.sendParam(ctx.Deployer))

      await truffleAssert.reverts(ctx.DPP.methods.reset(lp, "0", decimalStr("1"), decimalStr("2"), "0", "0", baseReserve, quoteReserve).send(ctx.sendParam(ctx.Deployer)), "RESERVE_AMOUNT_IS_NOT_ENOUGH")

      await ctx.QUOTE.methods.mint(ctx.DPP.options.address, decimalStr("200")).send(ctx.sendParam(ctx.Deployer))
      await ctx.DPP.methods.sellQuote(ctx.Deployer).send(ctx.sendParam(ctx.Deployer))

      await truffleAssert.reverts(ctx.DPP.methods.reset(lp, "0", decimalStr("1"), decimalStr("2"), "0", "0", baseReserve, quoteReserve).send(ctx.sendParam(ctx.Deployer)), "RESERVE_AMOUNT_IS_NOT_ENOUGH")
    })
  })

});
