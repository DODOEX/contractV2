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
  await ctx.approveProxy(lp);
  await ctx.approveProxy(project);
  await ctx.approveProxy(trader);

  await ctx.mintTestToken(lp, ctx.DODO, decimalStr("100000"));
  await ctx.mintTestToken(project, ctx.DODO, decimalStr("100000"));
  await ctx.mintTestToken(trader, ctx.DODO, decimalStr("100000"));

  await ctx.mintTestToken(lp, ctx.USDT, mweiStr("100000"));
  await ctx.mintTestToken(project, ctx.USDT, mweiStr("100000"));

  // await ctx.WETH.methods.deposit().send(ctx.sendParam(lp, '80'));
  // await ctx.WETH.methods.deposit().send(ctx.sendParam(project, '80'));
}


async function initCreateDPP(ctx: ProxyContext, token0: any, token1:any, token0Amount: string, token1Amount: string): Promise<void> {
  let PROXY = ctx.DODOProxy;
  await PROXY.methods.createDODOPrivatePool(
    token0.options.address,
    token1.options.address,
    token0Amount,
    token1Amount,
    config.lpFeeRate,
    config.mtFeeRate,
    config.i,
    config.k,
    Math.floor(new Date().getTime()/1000 + 60 * 10)
  ).send(ctx.sendParam(project));
}

describe("DODOProxyV2.0", () => {
  let snapshotId: string;
  let ctx: ProxyContext;

  before(async () => {
    ctx = await getProxyContext();
    await init(ctx);
    // await initCreateDPP(ctx,ctx.DODO,ctx.USDT,decimalStr("10000"),decimalStr("10000"));
    // await initCreateDPP(ctx,ctx.WETH,ctx.USDT,decimalStr("50"),decimalStr("10000"));
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("DODOProxy", () => {
    /**
     * 1. 创建空池子
     * 2. 创建ERC20 DPP
     * 3. 创建ETH && ERC20 Token 
     */
    it("createDPP - empty", async () => {
      var baseToken = ctx.DODO.options.address;
      var quoteToken = ctx.USDT.options.address;
      await ctx.DODOProxy.methods.createDODOPrivatePool(
        baseToken,
        quoteToken,
        decimalStr("0"),
        decimalStr("0"),
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        config.k,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ).send(ctx.sendParam(project));
      var addrs = await ctx.DPPFactory.methods.getPrivatePool(baseToken,quoteToken).call();
      var dppInfo = await ctx.DPPFactory.methods._DPP_INFO_(addrs[0]).call();
      console.log("dppInfo:",dppInfo);
      assert.equal(
        dppInfo[0],
        project
      );
    });


    it("resetDPP", async () => {
        //需要存钱
        //需要退钱
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
