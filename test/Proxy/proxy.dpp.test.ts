/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, mweiStr} from '../utils/Converter';
import { logGas } from '../utils/Log';
import { ProxyContext, getProxyContext } from '../utils/ProxyContext';
import { assert } from 'chai';

let lp: string;
let project: string;
let trader: string;

let config = {
  lpFeeRate: decimalStr("0.002"),
  mtFeeRate: decimalStr("0.001"),
  k: decimalStr("0.1"),
  i: decimalStr("100"),
};

async function init(ctx: ProxyContext): Promise<void> {
  lp = ctx.SpareAccounts[0];
  project = ctx.SpareAccounts[1];
  trader = ctx.SpareAccounts[2];

  await ctx.mintTestToken(lp, ctx.DODO, decimalStr("100000"));
  await ctx.mintTestToken(project, ctx.DODO, decimalStr("100000"));
  await ctx.mintTestToken(trader, ctx.DODO, decimalStr("100000"));

  await ctx.mintTestToken(lp, ctx.USDT, mweiStr("100000"));
  await ctx.mintTestToken(project, ctx.USDT, mweiStr("100000"));

  // await ctx.WETH.methods.deposit().send(ctx.sendParam(lp, '80'));
  // await ctx.WETH.methods.deposit().send(ctx.sendParam(project, '80'));

  await ctx.approveProxy(lp);
  await ctx.approveProxy(project);
  await ctx.approveProxy(trader);
}


async function initCreateDPP(ctx: ProxyContext, token0: string, token1:string, token0Amount: string, token1Amount: string, ethValue:string): Promise<string> {
  let PROXY = ctx.DODOProxy;
  await PROXY.methods.createDODOPrivatePool(
    token0,
    token1,
    token0Amount,
    token1Amount,
    config.lpFeeRate,
    config.mtFeeRate,
    config.i,
    config.k,
    Math.floor(new Date().getTime()/1000 + 60 * 10)
  ).send(ctx.sendParam(project,ethValue));
  if(token0 == '0x000000000000000000000000000000000000000E') token0 = ctx.WETH.options.address;
  if(token1 == '0x000000000000000000000000000000000000000E') token1 = ctx.WETH.options.address;
  var addr = await ctx.DPPFactory.methods._REGISTRY_(token0,token1,0).call();
  return addr;
}

describe("DODOProxyV2.0", () => {
  let snapshotId: string;
  let ctx: ProxyContext;
  let dpp_DODO_USDT: string;
  let dpp_WETH_USDT: string;

  before(async () => {
    ctx = await getProxyContext();
    await init(ctx);
    dpp_DODO_USDT = await initCreateDPP(ctx,ctx.DODO.options.address,ctx.USDT.options.address,decimalStr("10000"),mweiStr("10000"),"0");
    dpp_WETH_USDT = await initCreateDPP(ctx,'0x000000000000000000000000000000000000000E',ctx.USDT.options.address,decimalStr("10"),mweiStr("10000"),"10");
    console.log("dpp_DODO_USDT:",dpp_DODO_USDT);
    console.log("dpp_WETH_USDT:",dpp_WETH_USDT);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("DODOProxy", () => {
    it("createDPP", async () => {
      var baseToken = ctx.DODO.options.address;
      var quoteToken = ctx.USDT.options.address;
      var baseAmount = decimalStr("10000");
      var quoteAmount = mweiStr("10000");
      await ctx.DODOProxy.methods.createDODOPrivatePool(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        config.k,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ).send(ctx.sendParam(project));
      var addrs = await ctx.DPPFactory.methods.getPrivatePool(baseToken,quoteToken).call();
      var dppInfo = await ctx.DPPFactory.methods._DPP_INFO_(addrs[0]).call();
      assert.equal(
        dppInfo[0],
        project
      );
      assert.equal(
        await ctx.DODO.methods.balanceOf(addrs[0]).call(),
        baseAmount
      );
      assert.equal(
        await ctx.USDT.methods.balanceOf(addrs[0]).call(),
        quoteAmount
      );
    });


    it("createDPP - ETH", async () => {
      var baseToken = '0x000000000000000000000000000000000000000E';
      var quoteToken = ctx.USDT.options.address;
      var baseAmount = decimalStr("10");
      var quoteAmount = mweiStr("10000");
      await ctx.DODOProxy.methods.createDODOPrivatePool(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        config.k,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ).send(ctx.sendParam(project, "10"));
      var addrs = await ctx.DPPFactory.methods.getPrivatePool(ctx.WETH.options.address,quoteToken).call();
      var dppInfo = await ctx.DPPFactory.methods._DPP_INFO_(addrs[0]).call();
      assert.equal(
        dppInfo[0],
        project
      );
      assert.equal(
        await ctx.WETH.methods.balanceOf(addrs[0]).call(),
        baseAmount
      );
      assert.equal(
        await ctx.USDT.methods.balanceOf(addrs[0]).call(),
        quoteAmount
      );
    });

    it("resetDPP", async () => {
      // await ctx.DODOProxy.methods.resetDODOPrivatePool(
      //   dpp_DODO_USDT,
      //   config.lpFeeRate,
      //   config.mtFeeRate,
      //   config.i,
      //   config.k,
        
      //   Math.floor(new Date().getTime()/1000 + 60 * 10)
      // ).send(ctx.sendParam(project, "10"));
    });


    /**
     * trade
     */
    it("trade-sellQuote-R=1", async () => {
        //R变号与不变号
    });

    
    it("trade-sellQuote-R>1", async () => {
        //R变号与不变号
    });


    it("trade-sellQuote-R<1", async () => {
        //R变号与不变号
    });


    it("trade-sellBase-R=1", async () => {
        //R变号与不变号
    });


    it("trade-sellBase-R>1", async () => {
        //R变号与不变号
    });


    it("trade-sellBase-R<1", async () => {
        //R变号与不变号
    });



    it("retrieve", async () => {
        //eth允许
        //控制无法提取base && quote
    });


    /**
     * 直接底层dpp操作测试
     */

  });
});
