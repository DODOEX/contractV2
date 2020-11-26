/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, gweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';
import { EXTERNAL_VALUE_NAME, getContractWithAddress } from '../utils/Contracts';
const truffleAssert = require('truffle-assertions');

let lp: string;
let trader: string;

async function init(ctx: DVMContext): Promise<void> {
  lp = ctx.SpareAccounts[0];
  trader = ctx.SpareAccounts[1];

  await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"));
  await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"));

  await ctx.transferBaseToDVM(lp, decimalStr("10"))
  await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))

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
    // it.only("basic check", async () => {
    //   console.log(await ctx.DVM.methods.getVaultReserve().call())
    //   console.log(await ctx.DVM.methods.getPMMState().call())
    //   console.log(await ctx.DVM.methods.getMidPrice().call())
    //   console.log(await ctx.DVM.methods.querySellQuote(ctx.Deployer, decimalStr("200")).call())     
    //   console.log(ctx.BASE.options.address)
    //   console.log(await ctx.DVM.methods._BASE_TOKEN_().call())
    //   console.log(ctx.QUOTE.options.address)
    //   console.log(await ctx.DVM.methods._QUOTE_TOKEN_().call())
    // })

    // it.only("mannually buy", async () => {
    //   await ctx.QUOTE.methods.transfer(ctx.DVM.options.address, decimalStr("100")).send(ctx.sendParam(lp))
    //   console.log(await ctx.DVM.methods.getQuoteInput().call())
    //   console.log(await ctx.DVM.methods.querySellQuote(lp, decimalStr("100")).call())
    //   await ctx.DVM.methods.sellQuote(lp).send(ctx.sendParam(lp))
    // })

    it("buy & sell", async () => {

      console.log("BASE0 before buy", await ctx.DVM.methods.getBase0().call())

      // buy
      await ctx.transferQuoteToDVM(trader, decimalStr("200"))
      await logGas(ctx.DVM.methods.sellQuote(trader), ctx.sendParam(trader), "buy base token")
      console.log("BASE0 after buy", await ctx.DVM.methods.getBase0().call())
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
        await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
        "8051283784161162863"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
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
      await ctx.transferBaseToDVM(trader, decimalStr("1"))
      await logGas(ctx.DVM.methods.sellBase(trader), ctx.sendParam(trader), "sell base token")
      console.log("BASE0 after sell", await ctx.DVM.methods.getBase0().call())
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
        await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
        "9051283784161162863"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
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

      // buy when quoet is not 0
      await ctx.transferQuoteToDVM(trader, decimalStr("200"))
      await logGas(ctx.DVM.methods.sellQuote(trader), ctx.sendParam(trader), "buy base token")
      console.log("BASE0 after second buy", await ctx.DVM.methods.getBase0().call())
      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "12837528824326616010"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "703421810640399874603"
      );
      // vault balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
        "7158622099620899921"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
        "296474456349930717298"
      );
      // maintainer balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(),
        "3849076052484069"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(),
        "103733009669408099"
      );
    });

    it("flash loan", async () => {
      // buy
      await ctx.transferQuoteToDVM(trader, decimalStr("200"))

      // buy failed
      await truffleAssert.reverts(ctx.DVM.methods.flashLoan("1946763594380080788", "0", trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

      // buy succeed
      await ctx.DVM.methods.flashLoan("1946763594380080787", "0", trader, "0x").send(ctx.sendParam(trader))

      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "11946763594380080787"
      );

      // sell
      await ctx.transferBaseToDVM(trader, decimalStr("1"))

      // sell failed
      await truffleAssert.reverts(ctx.DVM.methods.flashLoan("0", "103421810640399874604", trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

      // sell succeed
      await ctx.DVM.methods.flashLoan("0", "103421810640399874603", trader, "0x").send(ctx.sendParam(trader))

      // trader balances
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "903421810640399874603"
      );

    })

    it("revert cases", async () => {
      var gasPriceLimitContract = getContractWithAddress(EXTERNAL_VALUE_NAME, await ctx.DVM.methods._GAS_PRICE_LIMIT_().call())
      await gasPriceLimitContract.methods.set(gweiStr("10")).send(ctx.sendParam(ctx.Deployer))


      await truffleAssert.reverts(
        ctx.DVM.methods.sellQuote(trader).send({ from: trader, gas: 300000, gasPrice: gweiStr("200") }), "GAS_PRICE_EXCEED"
      )

      await ctx.transferBaseToDVM(trader, decimalStr("1"))
      await truffleAssert.reverts(
        ctx.DVM.methods.sellBase(trader).send(ctx.sendParam(trader)), "TARGET_IS_ZERO"
      )
    })
  });
});