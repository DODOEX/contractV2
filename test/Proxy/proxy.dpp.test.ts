/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';
import BigNumber from "bignumber.js";
import { decimalStr, mweiStr} from '../utils/Converter';
import { logGas } from '../utils/Log';
import { ProxyContext, getProxyContext } from '../utils/ProxyContext';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';

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
  let DPP_DODO_USDT: Contract;
  let DPP_WETH_USDT: Contract;

  before(async () => {
    ctx = await getProxyContext();
    await init(ctx);
    dpp_DODO_USDT = await initCreateDPP(ctx,ctx.DODO.options.address,ctx.USDT.options.address,decimalStr("10000"),mweiStr("10000"), "0");
    DPP_DODO_USDT = contracts.getContractWithAddress(contracts.DPP_NAME,dpp_DODO_USDT);
    dpp_WETH_USDT = await initCreateDPP(ctx,'0x000000000000000000000000000000000000000E',ctx.USDT.options.address,decimalStr("5"),mweiStr("10000"),"5");
    DPP_WETH_USDT = contracts.getContractWithAddress(contracts.DPP_NAME,dpp_WETH_USDT);
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
      await logGas(await ctx.DODOProxy.methods.createDODOPrivatePool(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        config.k,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project),"createDPP");
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
      var baseAmount = decimalStr("5");
      var quoteAmount = mweiStr("10000");
      await logGas(await ctx.DODOProxy.methods.createDODOPrivatePool(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        config.k,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project, "5"),"createDPP - Wrap ETH");
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
      var beforeState = await DPP_DODO_USDT.methods.getPMMState().call();
      assert.equal(beforeState.K,config.k);
      assert.equal(beforeState.B0,decimalStr("10000"));
      assert.equal(beforeState.Q0,mweiStr("10000"));
      await logGas(await ctx.DODOProxy.methods.resetDODOPrivatePool(
        dpp_DODO_USDT,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        decimalStr("0.2"),
        decimalStr("1000"),
        mweiStr("1000"),
        decimalStr("0"),
        mweiStr("0"),
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project),"resetDPP");
      var afterState = await DPP_DODO_USDT.methods.getPMMState().call();
      assert.equal(afterState.K,decimalStr("0.2"));
      assert.equal(afterState.B0,decimalStr("11000"));
      assert.equal(afterState.Q0,mweiStr("11000"));
    });

    it("resetDPP - OutETH", async () => {
      var beforeState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(beforeState.K,config.k);
      assert.equal(beforeState.B0,decimalStr("5"));
      assert.equal(beforeState.Q0,mweiStr("10000"));
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      var tx = await logGas(await ctx.DODOProxy.methods.resetDODOPrivatePoolETH(
        dpp_WETH_USDT,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        decimalStr("0.2"),
        decimalStr("0"),
        mweiStr("1000"),
        decimalStr("1"),
        mweiStr("0"),
        3,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project),"resetDPP-ETH");
      var afterState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(afterState.K,decimalStr("0.2"));
      assert.equal(afterState.B0,decimalStr("4"));
      assert.equal(afterState.Q0,mweiStr("11000"));
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      console.log("b_ETH:",b_ETH);
      console.log("a_ETH:",a_ETH);
      assert.equal(new BigNumber(a_ETH).isGreaterThan(new BigNumber(b_ETH)),true);
    });

  });
});
