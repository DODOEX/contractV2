/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from "bignumber.js";
import { decimalStr, mweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { ProxyContext, getProxyContext } from '../utils/ProxyContextV2';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';

let lp: string;
let project: string;
let trader: string;

let config = {
  lpFeeRate: decimalStr("0.002"),
  k: decimalStr("0.1"),
  i: decimalStr("1"),
};

async function init(ctx: ProxyContext): Promise<void> {
  lp = ctx.SpareAccounts[0];
  project = ctx.SpareAccounts[1];
  trader = ctx.SpareAccounts[2];

  await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000000"));
  await ctx.mintTestToken(project, ctx.DODO, decimalStr("1000000"));

  await ctx.mintTestToken(lp, ctx.USDT, mweiStr("1000000"));
  await ctx.mintTestToken(project, ctx.USDT, mweiStr("1000000"));

  await ctx.mintTestToken(lp, ctx.USDC, mweiStr("1000000"));
  await ctx.mintTestToken(project, ctx.USDC, mweiStr("1000000"));

  await ctx.approveProxy(lp);
  await ctx.approveProxy(project);
  await ctx.approveProxy(trader);
}


async function initCreateDPP(ctx: ProxyContext, token0: string, token1: string, token0Amount: string, token1Amount: string, ethValue: string, i: string): Promise<string> {
  let PROXY = ctx.DODOProxyV2;
  await PROXY.methods.createDODOPrivatePool(
    token0,
    token1,
    token0Amount,
    token1Amount,
    config.lpFeeRate,
    i,
    config.k,
    false,
    Math.floor(new Date().getTime() / 1000 + 60 * 10)
  ).send(ctx.sendParam(project, ethValue));
  if (token0 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token0 = ctx.WETH.options.address;
  if (token1 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token1 = ctx.WETH.options.address;
  var addr = await ctx.DPPFactory.methods._REGISTRY_(token0, token1, 0).call();
  return addr;
}

describe("DODOProxyV2.0", () => {
  let snapshotId: string;
  let ctx: ProxyContext;
  let dpp_DODO_USDT: string;
  let dpp_WETH_USDT: string;
  let dpp_WETH_USDC: string;
  let dpp_USDT_USDC: string;
  let DPP_DODO_USDT: Contract;
  let DPP_WETH_USDT: Contract;
  let DPP_WETH_USDC: Contract;
  let DPP_USDT_USDC: Contract;

  before(async () => {
    let ETH = await contracts.newContract(
      contracts.WETH_CONTRACT_NAME
    );
    ctx = await getProxyContext(ETH.options.address);
    await init(ctx);
    dpp_DODO_USDT = await initCreateDPP(ctx, ctx.DODO.options.address, ctx.USDT.options.address, decimalStr("100000"), mweiStr("20000"), "0", mweiStr("0.2"));
    DPP_DODO_USDT = contracts.getContractWithAddress(contracts.DPP_NAME, dpp_DODO_USDT);
    dpp_USDT_USDC = await initCreateDPP(ctx, ctx.USDT.options.address, ctx.USDC.options.address, mweiStr("100000"), mweiStr("100000"), "0", decimalStr("1"));
    DPP_USDT_USDC = contracts.getContractWithAddress(contracts.DPP_NAME, dpp_USDT_USDC);
    dpp_WETH_USDC = await initCreateDPP(ctx, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', ctx.USDC.options.address, decimalStr("5"), mweiStr("3000"), "5", mweiStr("600"));
    DPP_WETH_USDC = contracts.getContractWithAddress(contracts.DPP_NAME, dpp_WETH_USDC);
    dpp_WETH_USDT = await initCreateDPP(ctx, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', ctx.USDT.options.address, decimalStr("5"), mweiStr("3000"), "5", mweiStr("600"));
    DPP_WETH_USDT = contracts.getContractWithAddress(contracts.DPP_NAME, dpp_WETH_USDT);
    console.log("dpp_DODO_USDT:", dpp_DODO_USDT);
    console.log("dpp_WETH_USDT:", dpp_WETH_USDT);
    console.log("dpp_WETH_USDC:", dpp_WETH_USDC);
    console.log("dpp_USDT_USDC:", dpp_USDT_USDC);
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
      await logGas(await ctx.DODOProxyV2.methods.createDODOPrivatePool(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.i,
        config.k,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project), "createDPP");
      var addrs = await ctx.DPPFactory.methods.getDODOPool(baseToken, quoteToken).call();
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
      await logGas(await ctx.DODOProxyV2.methods.createDODOPrivatePool(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.i,
        config.k,
        false,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project, "5"),"createDPP - Wrap ETH");
      var addrs = await ctx.DPPFactory.methods.getDODOPool(ctx.WETH.options.address,quoteToken).call();
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
      assert.equal(beforeState.K, config.k);
      assert.equal(beforeState.B, decimalStr("100000"));
      assert.equal(beforeState.Q, mweiStr("20000"));
      await logGas(await ctx.DODOProxyV2.methods.resetDODOPrivatePool(
        dpp_DODO_USDT,
        [config.lpFeeRate, mweiStr("0.2"), decimalStr("0.2")],
        [decimalStr("1000"), mweiStr("1000"), decimalStr("0"), mweiStr("0")],
        0,
        decimalStr("100000"),
        mweiStr("0"),
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project), "resetDPP");
      var afterState = await DPP_DODO_USDT.methods.getPMMState().call();
      assert.equal(afterState.K, decimalStr("0.2"));
      assert.equal(afterState.B, decimalStr("101000"));
      assert.equal(afterState.Q, mweiStr("21000"));
    });


    it("resetDPP - OutETH", async () => {
      var beforeState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(beforeState.K, config.k);
      assert.equal(beforeState.B0, decimalStr("5"));
      assert.equal(beforeState.Q0, mweiStr("3000"));
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      await logGas(await ctx.DODOProxyV2.methods.resetDODOPrivatePool(
        dpp_WETH_USDT,
        [config.lpFeeRate, mweiStr("600"), decimalStr("0.2")],
        [decimalStr("0"), mweiStr("100"), decimalStr("1"), mweiStr("0")],
        3,
        decimalStr("0"),
        mweiStr("0"),
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project), "resetDPP-OutETH");
      var afterState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(afterState.K, decimalStr("0.2"));
      assert.equal(afterState.B0, decimalStr("4"));
      assert.equal(afterState.Q0, mweiStr("3100"));
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      console.log("b_ETH:", b_ETH);
      console.log("a_ETH:", a_ETH);
      assert.equal(new BigNumber(b_ETH).isGreaterThan(new BigNumber(a_ETH).minus(decimalStr("1"))), true);
    });


    it("resetDPP - InETH", async () => {
      var beforeState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(beforeState.K, config.k);
      assert.equal(beforeState.B0, decimalStr("5"));
      assert.equal(beforeState.Q0, mweiStr("3000"));
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      await logGas(await ctx.DODOProxyV2.methods.resetDODOPrivatePool(
        dpp_WETH_USDT,
        [config.lpFeeRate, mweiStr("600"), decimalStr("0.2")],
        [decimalStr("1"), mweiStr("100"), decimalStr("0"), mweiStr("0")],
        1,
        decimalStr("0"),
        mweiStr("0"),
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project, "1"), "resetDPP-InETH");
      var afterState = await DPP_WETH_USDT.methods.getPMMState().call();
      assert.equal(afterState.K, decimalStr("0.2"));
      assert.equal(afterState.B0, decimalStr("6"));
      assert.equal(afterState.Q0, mweiStr("3100"));
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      console.log("b_ETH:", b_ETH);
      console.log("a_ETH:", a_ETH);
      assert.equal(new BigNumber(b_ETH).isGreaterThan(new BigNumber(a_ETH).plus(decimalStr("1"))), true);
    });

    it("swap - one jump", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_USDT = await ctx.USDT.methods.balanceOf(trader).call();
      var dodoPairs = [
        dpp_DODO_USDT
      ]
      var directions = 0
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
        ctx.DODO.options.address,
        ctx.USDT.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - one jump first");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_USDT = await ctx.USDT.methods.balanceOf(trader).call();
      // console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      // console.log("b_USDT:" + b_USDT + " a_USDT:" + a_USDT);
      assert.equal(a_DOOD, decimalStr("500"));
      assert.equal(a_USDT, "99749900");
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
        ctx.DODO.options.address,
        ctx.USDT.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - one jump second");
    });

    it("swap - two jump", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var dodoPairs = [
        dpp_DODO_USDT,
        dpp_WETH_USDT
      ]
      var directions = 2
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
        ctx.DODO.options.address,
        ctx.WETH.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump first");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      // console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      // console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      assert.equal(a_DOOD, decimalStr("500"));
      assert.equal(a_WETH, "165350643050738035");
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
        ctx.DODO.options.address,
        ctx.WETH.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump second");
    });

    it("swap - two jump - inETH", async () => {
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var b_ETH = await ctx.Web3.eth.getBalance(trader);
      var dodoPairs = [
        dpp_WETH_USDT,
        dpp_DODO_USDT
      ]
      var directions = 2
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2ETHToToken(
        ctx.DODO.options.address,
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader, "1"), "swap - two jump - inETH first");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var a_ETH = await ctx.Web3.eth.getBalance(trader);
      // console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      // console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      // console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_DOOD, "2908497423869401229986");
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2ETHToToken(
        ctx.DODO.options.address,
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader, "1"), "swap - two jump - inETH second");
    });


    it("swap - two jump - outETH", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var b_ETH = await ctx.Web3.eth.getBalance(trader);
      var dodoPairs = [
        dpp_DODO_USDT,
        dpp_WETH_USDT
      ]
      var directions = 2
      var tx = await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToETH(
        ctx.DODO.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump - outETH - first");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var a_ETH = await ctx.Web3.eth.getBalance(trader);
      // console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      // console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      // console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_DOOD, decimalStr("500"));
      assert.equal(
        tx.events['OrderHistory'].returnValues['returnAmount'],
        "165350643050738035"
      )
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToETH(
        ctx.DODO.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump - outETH - second");
    });


    it("swap - three jump", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var dodoPairs = [
        dpp_DODO_USDT,
        dpp_USDT_USDC,
        dpp_WETH_USDC
      ]
      var directions = 4
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
        ctx.DODO.options.address,
        ctx.WETH.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - three jump first");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      assert.equal(a_DOOD, decimalStr("500"));
      assert.equal(a_WETH, "165004688801375425");
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
        ctx.DODO.options.address,
        ctx.WETH.options.address,
        decimalStr("500"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - three jump second");
    });
  });
});
