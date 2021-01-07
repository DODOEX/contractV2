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
    //   console.log(await ctx.DVM.methods.symbol().call())
    //   console.log(await ctx.DVM.methods.decimals().call())
    //   console.log(await ctx.DVM.methods.name().call())
    // console.log(await ctx.DVM.methods.getVaultReserve().call())
    // console.log(await ctx.DVM.methods.getPMMState().call())
    // console.log(await ctx.DVM.methods.getMidPrice().call())
    // console.log(await ctx.DVM.methods.querySellQuote(ctx.Deployer, decimalStr("200")).call())     
    // console.log(ctx.BASE.options.address)
    // console.log(await ctx.DVM.methods._BASE_TOKEN_().call())
    // console.log(ctx.QUOTE.options.address)
    // console.log(await ctx.DVM.methods._QUOTE_TOKEN_().call())
    // })

    it("DVM ERC20 Shares info", async () => {
      console.log("DVM symbol", await ctx.DVM.methods.symbol().call())
      console.log("DVM decimals", await ctx.DVM.methods.decimals().call())
      console.log("DVM name", await ctx.DVM.methods.name().call())
    })

    it("buy & sell", async () => {

      // buy
      await ctx.transferQuoteToDVM(trader, decimalStr("200"))
      await logGas(ctx.DVM.methods.sellQuote(trader), ctx.sendParam(trader), "buy base token")
      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "11950668837297593488"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        decimalStr("800")
      );
      // vault balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
        "8047378541243650163"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
        decimalStr("200")
      );
      // maintainer balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(),
        "1952621458756349"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(),
        decimalStr("0")
      );

      // sell
      await ctx.transferBaseToDVM(trader, decimalStr("1"))
      await logGas(ctx.DVM.methods.sellBase(trader), ctx.sendParam(trader), "sell base token")
      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "10950668837297593488"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "903631079987679211407"
      );
      // vault balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
        "9047378541243650163"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
        "96265185197518306900"
      );
      // maintainer balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(),
        "1952621458756349"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(),
        "103734814802481693"
      );

      // buy when quoet is not 0
      await ctx.transferQuoteToDVM(trader, decimalStr("200"))
      await logGas(ctx.DVM.methods.sellQuote(trader), ctx.sendParam(trader), "buy base token")
      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "12845284163771515535"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "703631079987679211407"
      );
      // vault balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.DVM.options.address).call(),
        "7150866702931415882"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.DVM.options.address).call(),
        "296265185197518306900"
      );
      // maintainer balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Maintainer).call(),
        "3849133297068583"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Maintainer).call(),
        "103734814802481693"
      );
    });

    it("flash loan", async () => {
      // buy
      await ctx.transferQuoteToDVM(trader, decimalStr("200"))

      // buy failed
      await truffleAssert.reverts(ctx.DVM.methods.flashLoan("1946763594380080790", "0", trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

      // buy succeed
      await ctx.DVM.methods.flashLoan("1946763594380080789", "0", trader, "0x").send(ctx.sendParam(trader))

      // trader balances
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        "11946763594380080789"
      );

      // sell
      await ctx.transferBaseToDVM(trader, decimalStr("1"))

      // sell failed
      await truffleAssert.reverts(ctx.DVM.methods.flashLoan("0", "103421810640399874606", trader, "0x").send(ctx.sendParam(trader)), "FLASH_LOAN_FAILED")

      // sell succeed
      await ctx.DVM.methods.flashLoan("0", "103421810640399874605", trader, "0x").send(ctx.sendParam(trader))

      // trader balances
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "903421810640399874605"
      );

    })

    it("revert cases", async () => {
      // var gasPriceLimitContract = getContractWithAddress(EXTERNAL_VALUE_NAME, await ctx.DVM.methods._GAS_PRICE_LIMIT_().call())
      // await gasPriceLimitContract.methods.set(gweiStr("10")).send(ctx.sendParam(ctx.Deployer))


      await truffleAssert.reverts(
        ctx.DVM.methods.sellQuote(trader).send({ from: trader, gas: 300000, gasPrice: gweiStr("200") }), "GAS_PRICE_EXCEED"
      )

      await ctx.transferBaseToDVM(trader, decimalStr("1"))
      await truffleAssert.reverts(
        ctx.DVM.methods.sellBase(trader).send(ctx.sendParam(trader)), "TARGET_IS_ZERO"
      )
    })

    it("sync", async () => {
      await ctx.BASE.methods.mint(ctx.DVM.options.address, decimalStr("123")).send(ctx.sendParam(ctx.Deployer))
      await ctx.QUOTE.methods.mint(ctx.DVM.options.address, decimalStr("456")).send(ctx.sendParam(ctx.Deployer))

      await ctx.DVM.methods.sync().send(ctx.sendParam(ctx.Deployer))
      assert.equal(await ctx.DVM.methods._BASE_RESERVE_().call(), decimalStr("123"))
      assert.equal(await ctx.DVM.methods._QUOTE_RESERVE_().call(), decimalStr("456"))
    })
  });
});