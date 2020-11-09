/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import BigNumber from 'bignumber.js';
import { DODOContext, getDODOContext } from '../utils-v1/Context';
import { decimalStr,MAX_UINT256 } from '../utils-v1/Converter';
import { logGas } from '../utils-v1/Log';

let lp: string;
let trader: string;

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

}


async function calcRoute(ctx: DODOContext) {
  let fromTokenAmount = decimalStr("1");
  //路径
  let routes = [
    {
      address: ctx.BASE.options.address,
      decimals: 18
    },
    {
      address: ctx.QUOTE.options.address,
      decimals: 18
    }
  ]
  
  //路径上交易对
  let pairs = [
    {
      pair: ctx.DODO.options.address,
      base: ctx.BASE.options.address
    }
  ]
  let callPairs: string[] = []
  let datas: string = ""
  let starts: number[] = []
  let gAndV: number[] = []
  let swapAmount = fromTokenAmount
  for (let i = 0; i < pairs.length; i++) {
    let curPair = pairs[i]
    callPairs.push(curPair.pair)
    //TODO: hardcode
    let curContact =ctx.DODO;
    let curData = ''
    if (curPair.base === routes[i].address) {
      curData = await curContact.methods.sellBaseToken(swapAmount, 0, []).encodeABI()
      swapAmount = await curContact.methods.querySellBaseToken(swapAmount).call();
    } else {
      curData = await curContact.methods.buyBaseToken(swapAmount, 0, []).encodABI()
      swapAmount = await curContact.methods.queryBuyBaseToken(swapAmount).call();
    }
    starts.push(datas.length)
    gAndV.push(0)
    datas += curData
  }

  let toAmount  = new BigNumber(swapAmount).multipliedBy(0.99).toFixed(0, BigNumber.ROUND_DOWN)

  return ctx.SmartSwap.methods.dodoSwap(
    ctx.BASE.options.address,
    ctx.QUOTE.options.address,
    fromTokenAmount,
    toAmount,
    callPairs,
    datas,
    starts,
    gAndV
  )
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

  describe("hit currently pair", () => {
    it("base to quote", async () => {
      var beforeBalance = await ctx.BASE.methods.balanceOf(trader).call()
      // await ctx.BASE.methods.approve(ctx.SmartApprove.options.address,MAX_UINT256).send(ctx.sendParam(trader))
      console.log("beforeBalance",beforeBalance)
      await logGas(await calcRoute(ctx), ctx.sendParam(trader), "buy token")
      var afterBalance = await ctx.BASE.methods.balanceOf(trader).call()
      console.log("afterBalance",afterBalance)
      // // trader balances
      // assert.equal(
      //   await ctx.BASE.methods.balanceOf(trader).call(),
      //   decimalStr("11")
      // );
      // assert.equal(
      //   await ctx.QUOTE.methods.balanceOf(trader).call(),
      //   "898581839502056240973"
      // );
    });
  });


  // describe("Revert cases", () => {
  //   it("price limit", async () => {
  //     await assert.rejects(
  //       ctx.DODO.methods
  //         .buyBaseToken(decimalStr("1"), decimalStr("100"), "0x")
  //         .send(ctx.sendParam(trader)),
  //       /BUY_BASE_COST_TOO_MUCH/
  //     );
  //     await assert.rejects(
  //       ctx.DODO.methods
  //         .sellBaseToken(decimalStr("1"), decimalStr("100"), "0x")
  //         .send(ctx.sendParam(trader)),
  //       /SELL_BASE_RECEIVE_NOT_ENOUGH/
  //     );
  //   });

  //   it("base balance limit", async () => {
  //     await assert.rejects(
  //       ctx.DODO.methods
  //         .buyBaseToken(decimalStr("11"), decimalStr("10000"), "0x")
  //         .send(ctx.sendParam(trader)),
  //       /DODO_BASE_BALANCE_NOT_ENOUGH/
  //     );

  //     await ctx.DODO.methods
  //       .buyBaseToken(decimalStr("1"), decimalStr("200"), "0x")
  //       .send(ctx.sendParam(trader));

  //     await assert.rejects(
  //       ctx.DODO.methods
  //         .buyBaseToken(decimalStr("11"), decimalStr("10000"), "0x")
  //         .send(ctx.sendParam(trader)),
  //       /DODO_BASE_BALANCE_NOT_ENOUGH/
  //     );
  //   });
  // });
});
