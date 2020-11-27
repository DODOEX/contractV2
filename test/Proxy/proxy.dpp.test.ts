/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';
import BigNumber from "bignumber.js";
import { decimalStr, mweiStr } from '../utils/Converter';
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

  await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000000"));
  await ctx.mintTestToken(project, ctx.DODO, decimalStr("1000000"));

  await ctx.mintTestToken(lp, ctx.USDT, mweiStr("1000000"));
  await ctx.mintTestToken(project, ctx.USDT, mweiStr("1000000"));

  // await ctx.WETH.methods.deposit().send(ctx.sendParam(lp, '80'));
  // await ctx.WETH.methods.deposit().send(ctx.sendParam(project, '80'));

  await ctx.approveProxy(lp);
  await ctx.approveProxy(project);
  await ctx.approveProxy(trader);
}


async function initCreateDPP(ctx: ProxyContext, token0: string, token1:string, token0Amount: string, token1Amount: string, ethValue:string,i:string): Promise<string> {
  let PROXY = ctx.DODOProxy;
  await PROXY.methods.createDODOPrivatePool(
    token0,
    token1,
    token0Amount,
    token1Amount,
    config.lpFeeRate,
    config.mtFeeRate,
    i,
    config.k,
    Math.floor(new Date().getTime()/1000 + 60 * 10)
  ).send(ctx.sendParam(project,ethValue));
  if(token0 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token0 = ctx.WETH.options.address;
  if(token1 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token1 = ctx.WETH.options.address;
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
    dpp_DODO_USDT = await initCreateDPP(ctx,ctx.DODO.options.address,ctx.USDT.options.address,decimalStr("100000"),mweiStr("30000"), "0",mweiStr("0.3"));
    DPP_DODO_USDT = contracts.getContractWithAddress(contracts.DPP_NAME,dpp_DODO_USDT);
    dpp_WETH_USDT = await initCreateDPP(ctx,'0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',ctx.USDT.options.address,decimalStr("5"),mweiStr("30000"),"5",mweiStr("600"));
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
      var dppInfo = await ctx.DPPFactory.methods._DPP_INFO_(addrs[1]).call();
      assert.equal(
        dppInfo[0],
        project
      );
      assert.equal(
        await ctx.DODO.methods.balanceOf(addrs[1]).call(),
        baseAmount
      );
      assert.equal(
        await ctx.USDT.methods.balanceOf(addrs[1]).call(),
        quoteAmount
      );
    });


    it("createDPP - ETH", async () => {
      var baseToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
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
      var dppInfo = await ctx.DPPFactory.methods._DPP_INFO_(addrs[1]).call();
      assert.equal(
        dppInfo[0],
        project
      );
      assert.equal(
        await ctx.WETH.methods.balanceOf(addrs[1]).call(),
        baseAmount
      );
      assert.equal(
        await ctx.USDT.methods.balanceOf(addrs[1]).call(),
        quoteAmount
      );
    });

    it("resetDPP", async () => {
      var beforeState = await DPP_DODO_USDT.methods.getPMMState().call();
      assert.equal(beforeState.K,config.k);
      assert.equal(beforeState.B0,decimalStr("100000"));
      assert.equal(beforeState.Q0,mweiStr("30000"));
      await logGas(await ctx.DODOProxy.methods.resetDODOPrivatePool(
        dpp_DODO_USDT,
        config.lpFeeRate,
        config.mtFeeRate,
        mweiStr("0.3"),
        decimalStr("0.2"),
        decimalStr("1000"),
        mweiStr("1000"),
        decimalStr("0"),
        mweiStr("0"),
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project),"resetDPP");
      var afterState = await DPP_DODO_USDT.methods.getPMMState().call();
      assert.equal(afterState.K,decimalStr("0.2"));
      assert.equal(afterState.B0,decimalStr("101000"));
      assert.equal(afterState.Q0,mweiStr("31000"));
    });


    it("resetDPP - OutETH", async () => {
      var beforeState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(beforeState.K,config.k);
      assert.equal(beforeState.B0,decimalStr("5"));
      assert.equal(beforeState.Q0,mweiStr("30000"));
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      var tx = await logGas(await ctx.DODOProxy.methods.resetDODOPrivatePoolETH(
        dpp_WETH_USDT,
        config.lpFeeRate,
        config.mtFeeRate,
        mweiStr("600"),
        decimalStr("0.2"),
        decimalStr("0"),
        mweiStr("1000"),
        decimalStr("1"),
        mweiStr("0"),
        3,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project),"resetDPP-OutETH");
      var afterState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(afterState.K,decimalStr("0.2"));
      assert.equal(afterState.B0,decimalStr("4"));
      assert.equal(afterState.Q0,mweiStr("31000"));
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      console.log("b_ETH:",b_ETH);
      console.log("a_ETH:",a_ETH);
      assert.equal(new BigNumber(b_ETH).isGreaterThan(new BigNumber(a_ETH).minus(decimalStr("1"))),true);
    });


    it("resetDPP - InETH", async () => {
      var beforeState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(beforeState.K,config.k);
      assert.equal(beforeState.B0,decimalStr("5"));
      assert.equal(beforeState.Q0,mweiStr("30000"));
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      var tx = await logGas(await ctx.DODOProxy.methods.resetDODOPrivatePoolETH(
        dpp_WETH_USDT,
        config.lpFeeRate,
        config.mtFeeRate,
        mweiStr("600"),
        decimalStr("0.2"),
        decimalStr("1"),
        mweiStr("1000"),
        decimalStr("0"),
        mweiStr("0"),
        1,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project,"1"),"resetDPP-InETH");
      var afterState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(afterState.K,decimalStr("0.2"));
      assert.equal(afterState.B0,decimalStr("6"));
      assert.equal(afterState.Q0,mweiStr("31000"));
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      console.log("b_ETH:",b_ETH);
      console.log("a_ETH:",a_ETH);
      assert.equal(new BigNumber(b_ETH).isGreaterThan(new BigNumber(a_ETH).plus(decimalStr("1"))),true);
    });

    it("swap - one hop", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_USDT = await ctx.USDT.methods.balanceOf(trader).call();
      var dodoPairs = [
        dpp_DODO_USDT
      ]
      var directions = [
        0
      ]
      var tx = await logGas(await ctx.DODOProxy.methods.dodoSwapTokenToToken(
        trader,
        ctx.DODO.options.address,
        ctx.USDT.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(trader),"swap - one hop");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_USDT = await ctx.USDT.methods.balanceOf(trader).call();
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_USDT:" + b_USDT + " a_USDT:" + a_USDT);
      assert.equal(a_DOOD,decimalStr("500"));
      assert.equal(a_USDT,"149474924");
    });


    it("swap - two hop", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var dodoPairs = [
        dpp_DODO_USDT,
        dpp_WETH_USDT
      ]
      var directions = [
        0,
        1
      ]
      var tx = await logGas(await ctx.DODOProxy.methods.dodoSwapTokenToToken(
        trader,
        ctx.DODO.options.address,
        ctx.WETH.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(trader),"swap - two hop");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      assert.equal(a_DOOD,decimalStr("500"));
      assert.equal(a_WETH,"247088894507188480");
    });

    it("swap - two hop - inETH", async () => {
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var b_ETH = await ctx.Web3.eth.getBalance(trader);
      var dodoPairs = [
        dpp_WETH_USDT,
        dpp_DODO_USDT
      ]
      var directions = [
        0,
        1
      ]
      var tx = await logGas(await ctx.DODOProxy.methods.dodoSwapETHToToken(
        trader,
        ctx.DODO.options.address,
        decimalStr("1"),
        1,
        dodoPairs,
        directions,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(trader,"1"),"swap - two hop - inETH");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var a_ETH = await ctx.Web3.eth.getBalance(trader);
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_DOOD,"1979965731049456633086");
    });


    it("swap - two hop - outETH", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("100000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var b_ETH = await ctx.Web3.eth.getBalance(trader);
      var dodoPairs = [
        dpp_DODO_USDT,
        dpp_WETH_USDT
      ]
      var directions = [
        0,
        1
      ]
      var tx = await logGas(await ctx.DODOProxy.methods.dodoSwapTokenToETH(
        trader,
        ctx.DODO.options.address,
        decimalStr("10000"),
        1,
        dodoPairs,
        directions,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(trader),"swap - two hop - outETH");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var a_ETH = await ctx.Web3.eth.getBalance(trader);
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_DOOD,decimalStr("90000"));
      assert.equal(
        tx.events['OrderHistory'].returnValues['returnAmount'],
        "3760778358599649282"
      )
    });


  });
});
