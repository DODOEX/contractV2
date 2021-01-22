/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from "bignumber.js";
import { decimalStr, MAX_UINT256, mweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { ProxyContext, getProxyContext } from '../utils/ProxyContextV2';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';

let lp: string;
let project: string;
let trader: string;

let config = {
  lpFeeRate: decimalStr("0.003"),
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

async function initCreateDVM(ctx: ProxyContext, token0: string, token1: string, token0Amount: string, token1Amount: string, ethValue: string, i: string): Promise<string> {
  let PROXY = ctx.DODOProxyV2;
  await PROXY.methods.createDODOVendingMachine(
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
  var addr = await ctx.DVMFactory.methods._REGISTRY_(token0, token1, 0).call();
  return addr;
}


describe("DODOProxyV2.0", () => {
  let snapshotId: string;
  let ctx: ProxyContext;
  let dvm_DODO_USDT: string;
  let dvm_USDT_USDC: string;
  let dvm_WETH_USDT: string;
  let dvm_WETH_USDC: string;
  let DVM_DODO_USDT: Contract;
  let DVM_USDT_USDC: Contract;
  let DVM_WETH_USDT: Contract;
  let DVM_WETH_USDC: Contract;

  before(async () => {
    let ETH = await contracts.newContract(
      contracts.WETH_CONTRACT_NAME
    );
    ctx = await getProxyContext(ETH.options.address);
    await init(ctx);
    dvm_DODO_USDT = await initCreateDVM(ctx, ctx.DODO.options.address, ctx.USDT.options.address, decimalStr("100000"), mweiStr("20000"), "0", mweiStr("0.2"));
    DVM_DODO_USDT = contracts.getContractWithAddress(contracts.DVM_NAME, dvm_DODO_USDT);
    dvm_USDT_USDC = await initCreateDVM(ctx, ctx.USDT.options.address, ctx.USDC.options.address, mweiStr("100000"), mweiStr("1000"), "0", decimalStr("1"));
    DVM_USDT_USDC = contracts.getContractWithAddress(contracts.DVM_NAME, dvm_USDT_USDC);
    dvm_WETH_USDT = await initCreateDVM(ctx, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', ctx.USDT.options.address, decimalStr("5"), mweiStr("3000"), "5", mweiStr("600"));
    DVM_WETH_USDT = contracts.getContractWithAddress(contracts.DVM_NAME, dvm_WETH_USDT);
    dvm_WETH_USDC = await initCreateDVM(ctx, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', ctx.USDC.options.address, decimalStr("5"), mweiStr("3000"), "5", mweiStr("600"));
    DVM_WETH_USDC = contracts.getContractWithAddress(contracts.DVM_NAME, dvm_WETH_USDC);
    console.log("dvm_DODO_USDT:", dvm_DODO_USDT);
    console.log("dvm_USDT_USDC:", dvm_USDT_USDC);
    console.log("dvm_WETH_USDT:", dvm_WETH_USDT);
    console.log("dvm_WETH_USDC:", dvm_WETH_USDC);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("DODOProxy", () => {
    it("createDVM", async () => {
      var baseToken = ctx.DODO.options.address;
      var quoteToken = ctx.USDT.options.address;
      var baseAmount = decimalStr("10000");
      var quoteAmount = mweiStr("10000");
      await logGas(await ctx.DODOProxyV2.methods.createDODOVendingMachine(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.i,
        config.k,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project), "createDVM");
      var addrs = await ctx.DVMFactory.methods.getDODOPool(baseToken, quoteToken).call();
      assert.equal(
        await ctx.DODO.methods.balanceOf(addrs[1]).call(),
        baseAmount
      );
      assert.equal(
        await ctx.USDT.methods.balanceOf(addrs[1]).call(),
        quoteAmount
      );


    });
 
    it("createDVM - ETH", async () => {
      var baseToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      var quoteToken = ctx.USDT.options.address;
      var baseAmount = decimalStr("5");
      var quoteAmount = mweiStr("10000");
      await logGas(await ctx.DODOProxyV2.methods.createDODOVendingMachine(
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.i,
        config.k,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project, '5'), "createDVM - Wrap ETH");
      var addrs = await ctx.DVMFactory.methods.getDODOPool(ctx.WETH.options.address, quoteToken).call();
      assert.equal(
        await ctx.WETH.methods.balanceOf(addrs[1]).call(),
        baseAmount
      );
      assert.equal(
        await ctx.USDT.methods.balanceOf(addrs[1]).call(),
        quoteAmount
      );
    });


    it("addLiquidity", async () => {
      var b_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_DODO_USDT.methods.balanceOf(lp).call();
      assert.equal(b_baseReserve, decimalStr("100000"));
      assert.equal(b_quoteReserve, mweiStr("20000"));
      assert.equal(b_dlp, decimalStr("0"));
      await logGas(await ctx.DODOProxyV2.methods.addDVMLiquidity(
        dvm_DODO_USDT,
        decimalStr("1000"),
        mweiStr("300"),
        decimalStr("0"),
        mweiStr("0"),
        0,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(lp), "addLiquidity");
      var a_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_DODO_USDT.methods.balanceOf(lp).call();
      assert.equal(a_baseReserve, decimalStr("101000"));
      assert.equal(a_quoteReserve, mweiStr("20200"));
      assert.equal(a_dlp, "1000000000000000000000");
    });


    it("addLiquidity - ETH", async () => {
      var b_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_WETH_USDT.methods.balanceOf(lp).call();
      assert.equal(b_baseReserve, decimalStr("5"));
      assert.equal(b_quoteReserve, mweiStr("3000"));
      assert.equal(b_dlp, decimalStr("0"));
      await logGas(await ctx.DODOProxyV2.methods.addDVMLiquidity(
        dvm_WETH_USDT,
        decimalStr("1"),
        mweiStr("6000"),
        decimalStr("0"),
        mweiStr("0"),
        1,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(lp, '1'), "addLiquidity - ETH");
      var a_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_WETH_USDT.methods.balanceOf(lp).call();
      assert.equal(a_baseReserve, decimalStr("6"));
      assert.equal(a_quoteReserve, mweiStr("3600"));
      assert.equal(a_dlp, "1000000000000000000");
    });


    it("sellShares - ETH helper", async () => {
      var b_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(project).call();
      var b_USDT = await ctx.USDT.methods.balanceOf(project).call();
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      // console.log("b_baseReserve:" + b_baseReserve + " b_quoteReserve:" + b_quoteReserve + " b_dlp:" + b_dlp + " b_WETH:" + b_WETH + " b_USDT:" + b_USDT + " b_ETH:" + b_ETH);
      await logGas(await DVM_WETH_USDT.methods.sellShares(
        decimalStr("1"),
        ctx.DODOCalleeHelper.options.address,
        decimalStr("0"),
        mweiStr("0"),
        '0x00',
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project), "sellShares - ETH helper");

      var a_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(project).call();
      var a_USDT = await ctx.USDT.methods.balanceOf(project).call();
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      // console.log("a_baseReserve:" + a_baseReserve + " a_quoteReserve:" + a_quoteReserve + " a_dlp:" + a_dlp + " a_WETH:" + a_WETH + " a_USDT:" + a_USDT + " a_ETH:" + a_ETH);
      assert.equal(a_baseReserve, decimalStr("4"));
      assert.equal(a_quoteReserve, mweiStr("2400"));
      assert.equal(a_dlp, decimalStr("4"));
      assert.equal(a_WETH, decimalStr("0"));
      assert.equal(a_USDT, mweiStr("877600"));
      assert.equal(new BigNumber(b_ETH).isGreaterThan(new BigNumber(a_ETH).minus(decimalStr("1"))), true);
    })

    it("sellShares - Without ETH helper", async () => {
      var b_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(project).call();
      var b_USDT = await ctx.USDT.methods.balanceOf(project).call();
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      // console.log("b_baseReserve:" + b_baseReserve + " b_quoteReserve:" + b_quoteReserve + " b_dlp:" + b_dlp + " b_WETH:" + b_WETH + " b_USDT:" + b_USDT + " b_ETH:" + b_ETH);
      await logGas(await DVM_WETH_USDT.methods.sellShares(
        decimalStr("1"),
        project,
        decimalStr("0"),
        mweiStr("0"),
        '0x',
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project), "sellShares - Without ETH helper");

      var a_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(project).call();
      var a_USDT = await ctx.USDT.methods.balanceOf(project).call();
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      // console.log("a_baseReserve:" + a_baseReserve + " a_quoteReserve:" + a_quoteReserve + " a_dlp:" + a_dlp + " a_WETH:" + a_WETH + " a_USDT:" + a_USDT + " a_ETH:" + a_ETH);
      assert.equal(a_baseReserve, decimalStr("4"));
      assert.equal(a_quoteReserve, mweiStr("2400"));
      assert.equal(a_dlp, decimalStr("4"));
      assert.equal(a_WETH, decimalStr("1"));
      assert.equal(a_USDT, mweiStr("877600"));
    })

    it("swap - one jump", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_USDT = await ctx.USDT.methods.balanceOf(trader).call();
      var dodoPairs = [
        dvm_DODO_USDT
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
      assert.equal(a_USDT, "126151370");
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
        dvm_DODO_USDT,
        dvm_WETH_USDT
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
      assert.equal(a_WETH, "163816613646287588");
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
        dvm_WETH_USDT,
        dvm_DODO_USDT
      ]
      var directions = 2
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2ETHToToken(
        ctx.DODO.options.address,
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader, "1"), "swap - two jump - inETH - first");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var a_ETH = await ctx.Web3.eth.getBalance(trader);
      // console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      // console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      // console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_DOOD, "2814340111190341070680");
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2ETHToToken(
        ctx.DODO.options.address,
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader, "1"), "swap - two jump - inETH - second");
    });


    it("swap - two jump - outETH", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("2000"));
      var dodoPairs = [
        dvm_DODO_USDT,
        dvm_WETH_USDT
      ]
      var directions = 2
      var tx = await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToETH(
        ctx.DODO.options.address,
        decimalStr("1000"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump - outETH first");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      assert.equal(a_DOOD, decimalStr("1000"));
      assert.equal(
        tx.events['OrderHistory'].returnValues['returnAmount'],
        "323865907568573497"
      )
      await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToETH(
        ctx.DODO.options.address,
        decimalStr("1000"),
        1,
        dodoPairs,
        directions,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump - outETH second");
    });

    it("swap - three jump", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var dodoPairs = [
        dvm_DODO_USDT,
        dvm_USDT_USDC,
        dvm_WETH_USDC
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
      assert.equal(a_DOOD, decimalStr("500"));
      assert.equal(a_WETH, "163633965833613187");
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
