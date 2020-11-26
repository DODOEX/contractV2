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

async function initCreateDVM(ctx: ProxyContext, token0: string, token1:string, token0Amount: string, token1Amount: string, ethValue:string,i:string): Promise<string> {
  let PROXY = ctx.DODOProxy;
  await PROXY.methods.createDODOVendingMachine(
    project,
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
  var addr = await ctx.DVMFactory.methods._REGISTRY_(token0,token1,0).call();
  return addr;
}


describe("DODOProxyV2.0", () => {
  let snapshotId: string;
  let ctx: ProxyContext;
  let dvm_DODO_USDT: string;
  let dvm_WETH_USDT: string;
  let DVM_DODO_USDT: Contract;
  let DVM_WETH_USDT: Contract;

  before(async () => {
    ctx = await getProxyContext();
    await init(ctx);
    dvm_DODO_USDT = await initCreateDVM(ctx,ctx.DODO.options.address,ctx.USDT.options.address,decimalStr("100000"),mweiStr("30000"), "0",mweiStr("0.3"));
    DVM_DODO_USDT = contracts.getContractWithAddress(contracts.DVM_NAME,dvm_DODO_USDT);
    dvm_WETH_USDT = await initCreateDVM(ctx,'0x000000000000000000000000000000000000000E',ctx.USDT.options.address,decimalStr("5"),mweiStr("30000"),"5",mweiStr("600"));
    DVM_WETH_USDT = contracts.getContractWithAddress(contracts.DVM_NAME,dvm_WETH_USDT);
    console.log("dvm_DODO_USDT:",dvm_DODO_USDT);
    console.log("dvm_WETH_USDT:",dvm_WETH_USDT);
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
      await logGas(await ctx.DODOProxy.methods.createDODOVendingMachine(
        project,
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        config.k,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project),"createDVM");
      var addrs = await ctx.DVMFactory.methods.getVendingMachine(baseToken,quoteToken).call();
      var dvmInfo = await ctx.DVMFactory.methods._DVM_INFO_(addrs[1]).call();
      assert.equal(
        dvmInfo[0],
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


    it("createDVM - ETH", async () => {
      var baseToken = '0x000000000000000000000000000000000000000E';
      var quoteToken = ctx.USDT.options.address;
      var baseAmount = decimalStr("5");
      var quoteAmount = mweiStr("10000");
      await logGas(await ctx.DODOProxy.methods.createDODOVendingMachine(
        project,
        baseToken,
        quoteToken,
        baseAmount,
        quoteAmount,
        config.lpFeeRate,
        config.mtFeeRate,
        config.i,
        config.k,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project, '5'),"createDVM - Wrap ETH");
      var addrs = await ctx.DVMFactory.methods.getVendingMachine(ctx.WETH.options.address,quoteToken).call();
      var dvmInfo = await ctx.DVMFactory.methods._DVM_INFO_(addrs[1]).call();
      assert.equal(
        dvmInfo[0],
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
 

    it("addLiquidity", async () => {
      var b_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_DODO_USDT.methods.balanceOf(lp).call();
      assert.equal(b_baseReserve,decimalStr("100000"));
      assert.equal(b_quoteReserve,mweiStr("30000"));
      assert.equal(b_dlp,decimalStr("0"));
      await logGas(await ctx.DODOProxy.methods.addDVMLiquidity(
        dvm_DODO_USDT,
        lp,
        decimalStr("1000"),
        mweiStr("300"),
        decimalStr("0"),
        mweiStr("0"),
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(lp),"addLiquidity");
      var a_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_DODO_USDT.methods.balanceOf(lp).call();
      assert.equal(a_baseReserve,decimalStr("101000"));
      assert.equal(a_quoteReserve,mweiStr("30300"));
      assert.equal(a_dlp,"1000000000000000000000");
    });


    it("addLiquidity - ETH", async () => {
      var b_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_WETH_USDT.methods.balanceOf(lp).call();
      assert.equal(b_baseReserve,decimalStr("5"));
      assert.equal(b_quoteReserve,mweiStr("30000"));
      assert.equal(b_dlp,decimalStr("0"));
      await logGas(await ctx.DODOProxy.methods.addDVMLiquidityETH(
        dvm_WETH_USDT,
        lp,
        decimalStr("1"),
        mweiStr("6000"),
        decimalStr("0"),
        mweiStr("0"),
        1,
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(lp,'1'),"addLiquidity - ETH");
      var a_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_WETH_USDT.methods.balanceOf(lp).call();
      assert.equal(a_baseReserve,decimalStr("6"));
      assert.equal(a_quoteReserve,mweiStr("36000"));
      assert.equal(a_dlp,"1000000000000000000");
    });

    //TODO:ing   
    it("removeLiquidity", async () => {
      var b_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_DODO_USDT.methods.balanceOf(project).call();
      assert.equal(b_baseReserve,decimalStr("100000"));
      assert.equal(b_quoteReserve,mweiStr("30000"));
      console.log("b_dlp:" + b_dlp);
      // assert.equal(b_dlp,decimalStr("0"));
      await logGas(await ctx.DODOProxy.methods.removeDVMLiquidity(
        dvm_DODO_USDT,
        project,
        decimalStr("100"),
        decimalStr("0"),
        mweiStr("0"),
        Math.floor(new Date().getTime()/1000 + 60 * 10)
      ),ctx.sendParam(project),"removeLiquidity");
      var a_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_DODO_USDT.methods.balanceOf(project).call();
      // assert.equal(a_baseReserve,decimalStr("6"));
      // assert.equal(a_quoteReserve,mweiStr("36000"));
      // assert.equal(a_dlp,"1000000000000000000");
      console.log("b_dlp:" + b_dlp + " a_dlp:" + a_dlp);
      console.log("a_baseReserve:" + a_baseReserve + " a_quoteReserve:" + a_quoteReserve);
    });

    /**
     *
     */
    it("dodoSwap", async () => {

    });


  });
});
