/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';
const ethUtil = require('ethereumjs-util');
import { SignHelper } from "../utils/SignHelper";
import BigNumber from "bignumber.js";
import { decimalStr, MAX_UINT256, mweiStr } from '../utils/Converter';
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

//For Permit Init
let typedData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ]
  },
  primaryType: 'Permit',
  domain: {
    name: '',
    version: '1',
    chainId: 1,
    verifyingContract: '',
  },
  message: {
    owner: "",
    spender: "",
    value: MAX_UINT256,
    nonce: 0,
    deadline: 0
  }
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
    i,
    config.k,
    Math.floor(new Date().getTime()/1000 + 60 * 10)
  ).send(ctx.sendParam(project,ethValue));
  if(token0 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token0 = ctx.WETH.options.address;
  if(token1 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token1 = ctx.WETH.options.address;
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
    dvm_WETH_USDT = await initCreateDVM(ctx,'0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',ctx.USDT.options.address,decimalStr("5"),mweiStr("30000"),"5",mweiStr("600"));
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
        0,
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
      await logGas(await ctx.DODOProxy.methods.addDVMLiquidity(
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


    it("sellShares - ETH helper", async () => {
      var b_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var b_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var b_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(project).call();
      var b_USDT = await ctx.USDT.methods.balanceOf(project).call();
      var b_ETH = await ctx.Web3.eth.getBalance(project);
      // console.log("b_baseReserve:" + b_baseReserve + " b_quoteReserve:" + b_quoteReserve + " b_dlp:" + b_dlp + " b_WETH:" + b_WETH + " b_USDT:" + b_USDT + " b_ETH:" + b_ETH);
      assert.equal(b_baseReserve,decimalStr("5"));
      assert.equal(b_quoteReserve, mweiStr("30000"));
      assert.equal(b_dlp,decimalStr("5"));
      assert.equal(b_WETH,decimalStr("0"));
      assert.equal(b_USDT, mweiStr("940000"));
      await logGas(await DVM_WETH_USDT.methods.sellShares(
        decimalStr("1"),
        ctx.DODOCalleeHelper.options.address,
        decimalStr("0"),
        mweiStr("0"),
        '0x00',
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(project),"sellShares - ETH helper");

      var a_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
      var a_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
      var a_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(project).call();
      var a_USDT = await ctx.USDT.methods.balanceOf(project).call();
      var a_ETH = await ctx.Web3.eth.getBalance(project);
      console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_baseReserve, decimalStr("4"));
      assert.equal(a_quoteReserve, mweiStr("24000"));
      assert.equal(a_dlp, decimalStr("4"));
      assert.equal(a_WETH, decimalStr("0"));
      assert.equal(a_USDT, mweiStr("946000"));
      assert.equal(new BigNumber(b_ETH).isGreaterThan(new BigNumber(a_ETH).minus(decimalStr("1"))), true);
    })

    it("swap - one jump", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_USDT = await ctx.USDT.methods.balanceOf(trader).call();
      var dodoPairs = [
        dvm_DODO_USDT
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
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - one jump");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_USDT = await ctx.USDT.methods.balanceOf(trader).call();
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_USDT:" + b_USDT + " a_USDT:" + a_USDT);
      assert.equal(a_DOOD, decimalStr("500"));
      assert.equal(a_USDT, "189227055");
    });


    it("swap - two jump", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var dodoPairs = [
        dvm_DODO_USDT,
        dvm_WETH_USDT
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
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      assert.equal(a_DOOD, decimalStr("500"));
      assert.equal(a_WETH, "51466023624936494");
    });

    it("swap - two jump - inETH", async () => {
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var b_ETH = await ctx.Web3.eth.getBalance(trader);
      var dodoPairs = [
        dvm_WETH_USDT,
        dvm_DODO_USDT
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
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader, "1"), "swap - two jump - inETH");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var a_ETH = await ctx.Web3.eth.getBalance(trader);
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_DOOD, "7952984575630657240990");
    });


    it("swap - two jump - outETH", async () => {
      await ctx.mintTestToken(trader, ctx.DODO, decimalStr("100000"));
      var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var b_ETH = await ctx.Web3.eth.getBalance(trader);
      var dodoPairs = [
        dvm_DODO_USDT,
        dvm_WETH_USDT
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
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
      ), ctx.sendParam(trader), "swap - two jump - outETH");
      var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
      var a_ETH = await ctx.Web3.eth.getBalance(trader);
      console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
      console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
      console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
      assert.equal(a_DOOD, decimalStr("90000"));
      assert.equal(
        tx.events['OrderHistory'].returnValues['returnAmount'],
        "859941980524143252"
      )
    });

    // it("removeLiquidity", async () => {
    //   var b_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
    //   var b_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
    //   var b_dlp = await DVM_DODO_USDT.methods.balanceOf(project).call();
    //   var b_DODO = await ctx.DODO.methods.balanceOf(project).call();
    //   var b_USDT = await ctx.USDT.methods.balanceOf(project).call();
    //   assert.equal(b_baseReserve,decimalStr("100000"));
    //   assert.equal(b_quoteReserve,mweiStr("30000"));
    //   assert.equal(b_dlp,decimalStr("100000"));
    //   assert.equal(b_DODO,decimalStr("900000"));
    //   assert.equal(b_USDT,mweiStr("940000"));
    //   await DVM_DODO_USDT.methods.approve(ctx.SmartApprove.options.address, MAX_UINT256).send(ctx.sendParam(project));
    //   await logGas(await ctx.DODOProxy.methods.removeDVMLiquidity(
    //     dvm_DODO_USDT,
    //     project,
    //     decimalStr("100"),
    //     decimalStr("0"),
    //     mweiStr("0"),
    //     0,
    //     Math.floor(new Date().getTime() / 1000 + 60 * 10)
    //   ),ctx.sendParam(project),"removeLiquidity");
    //   var a_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
    //   var a_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
    //   var a_dlp = await DVM_DODO_USDT.methods.balanceOf(project).call();
    //   var a_DODO = await ctx.DODO.methods.balanceOf(project).call();
    //   var a_USDT = await ctx.USDT.methods.balanceOf(project).call();
    //   assert.equal(a_baseReserve, decimalStr("99900"));
    //   assert.equal(a_quoteReserve, mweiStr("29970"));
    //   assert.equal(a_dlp, decimalStr("99900"));
    //   assert.equal(a_DODO, decimalStr("900100"));
    //   assert.equal(a_USDT, mweiStr("940030"));
    // });

    // it("removeLiquidity - ETH", async () => {
    //   var b_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
    //   var b_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
    //   var b_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
    //   var b_WETH = await ctx.WETH.methods.balanceOf(project).call();
    //   var b_USDT = await ctx.USDT.methods.balanceOf(project).call();
    //   var b_ETH = await ctx.Web3.eth.getBalance(project);
    //   assert.equal(b_baseReserve, decimalStr("5"));
    //   assert.equal(b_quoteReserve, mweiStr("30000"));
    //   assert.equal(b_dlp, decimalStr("5"));
    //   assert.equal(b_WETH, decimalStr("0"));
    //   assert.equal(b_USDT, mweiStr("940000"));
    //   await DVM_WETH_USDT.methods.approve(ctx.SmartApprove.options.address, MAX_UINT256).send(ctx.sendParam(project));
    //   var tx = await logGas(await ctx.DODOProxy.methods.removeDVMLiquidity(
    //     dvm_WETH_USDT,
    //     project,
    //     decimalStr("1"),
    //     decimalStr("0"),
    //     mweiStr("0"),
    //     1,
    //     Math.floor(new Date().getTime() / 1000 + 60 * 10)
    //   ), ctx.sendParam(project), "removeLiquidity - ETH");
    //   var a_baseReserve = await DVM_WETH_USDT.methods._BASE_RESERVE_().call();
    //   var a_quoteReserve = await DVM_WETH_USDT.methods._QUOTE_RESERVE_().call();
    //   var a_dlp = await DVM_WETH_USDT.methods.balanceOf(project).call();
    //   var a_WETH = await ctx.WETH.methods.balanceOf(project).call();
    //   var a_USDT = await ctx.USDT.methods.balanceOf(project).call();
    //   var a_ETH = await ctx.Web3.eth.getBalance(project);
    //   // console.log("a_baseReserve:" + a_baseReserve + " a_quoteReserve:" + a_quoteReserve + " a_dlp:" + a_dlp + " a_WETH:" + a_WETH + " a_USDT:" + a_USDT);
    //   assert.equal(a_baseReserve, decimalStr("4"));
    //   assert.equal(a_quoteReserve, mweiStr("24000"));
    //   assert.equal(a_dlp, decimalStr("4"));
    //   assert.equal(a_WETH, decimalStr("0"));
    //   assert.equal(a_USDT, mweiStr("946000"));
    //   console.log("b_ETH:", b_ETH);
    //   console.log("a_ETH:", a_ETH);
    //   assert.equal(new BigNumber(b_ETH).isGreaterThan(new BigNumber(a_ETH).minus(decimalStr("1"))), true);
    // });


    // it("removeLiquidity - permit", async () => {
    //   var b_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
    //   var b_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
    //   var b_dlp = await DVM_DODO_USDT.methods.balanceOf(project).call();
    //   var b_DODO = await ctx.DODO.methods.balanceOf(project).call();
    //   var b_USDT = await ctx.USDT.methods.balanceOf(project).call();
    //   assert.equal(b_baseReserve, decimalStr("100000"));
    //   assert.equal(b_quoteReserve, mweiStr("30000"));
    //   assert.equal(b_dlp, decimalStr("100000"));
    //   assert.equal(b_DODO, decimalStr("900000"));
    //   assert.equal(b_USDT, mweiStr("940000"));

    //   var DOMAIN_SEPARATOR = await DVM_DODO_USDT.methods.DOMAIN_SEPARATOR().call();
    //   // var name = await DVM_DODO_USDT.methods.name().call();
    //   // typedData.domain.name = ctx.Web3.utils.sha3(name);
    //   // typedData.domain.version = ctx.Web3.utils.sha3('1');
    //   // typedData.domain.chainId = await ctx.Web3.eth.getChainId();
    //   // typedData.domain.verifyingContract = dvm_DODO_USDT;
    //   typedData.message.owner = project;
    //   typedData.message.spender = ctx.SmartApprove.options.address;
    //   var nonceStr = await DVM_DODO_USDT.methods.nonces(project).call();
    //   typedData.message.nonce = parseInt(nonceStr);
    //   typedData.message.deadline = Math.floor(new Date().getTime() / 1000 + 60 * 10);
    //   var resHash = new SignHelper().signHash(DOMAIN_SEPARATOR,typedData.message);
    //   var sig = await ctx.Web3.eth.sign('0x' + resHash.toString('hex'), project);
    //   // let r = sig.slice(0, 66)
    //   // let s = '0x' + sig.slice(66, 130)
    //   // let v = '0x1c'
    //   const signRes = ethUtil.fromRpcSig(sig);
    //   const prefix = Buffer.from("\x19Ethereum Signed Message:\n");
    //   const prefixedMsg = ethUtil.keccak256(
    //     Buffer.concat([prefix, Buffer.from(String(resHash.length)), resHash])
    //   );
    //   console.log("add-prefix-degist:", "0x" + prefixedMsg.toString('hex'));
    //   var pubKey = ethUtil.ecrecover(prefixedMsg, signRes.v,signRes.r,signRes.s)
    //   // var pubKey = ethUtil.ecrecover(resHash, Buffer.from(v), Buffer.from(r), Buffer.from(s))
    //   var addrBuf = ethUtil.pubToAddress(pubKey);
    //   console.log("project:" + project);
    //   console.log("addr-web3-recover:" + ethUtil.bufferToHex(addrBuf));
    //   // var tx = await logGas(await DVM_DODO_USDT.methods.permit(project, typedData.message.spender, typedData.message.value, typedData.message.deadline, signRes.v, signRes.r, signRes.s), ctx.sendParam(project), "perimit test");
    //   // console.log("addr-sol-recover:" + tx.events['TestAddr'].returnValues['addr']);
    //   // console.log("sol-domain:" + tx.events['TestAddr'].returnValues['domain']);
    //   // console.log("sol-msg:" + tx.events['TestAddr'].returnValues['message']);
    //   // console.log("sol-digest:" + tx.events['TestAddr'].returnValues['digest']);
    //   // await logGas(await ctx.DODOProxy.methods.removeDVMLiquidityWithPermit(
    //   //   dvm_DODO_USDT,
    //   //   project,
    //   //   decimalStr("100"),
    //   //   decimalStr("0"),
    //   //   mweiStr("0"),
    //   //   0,
    //   //   typedData.message.deadline,
    //   //   true,
    //   //   signRes.v, signRes.r, signRes.s          
    //   // ), ctx.sendParam(project), "removeLiquidity perimit");
    //   // var a_baseReserve = await DVM_DODO_USDT.methods._BASE_RESERVE_().call();
    //   // var a_quoteReserve = await DVM_DODO_USDT.methods._QUOTE_RESERVE_().call();
    //   // var a_dlp = await DVM_DODO_USDT.methods.balanceOf(project).call();
    //   // var a_DODO = await ctx.DODO.methods.balanceOf(project).call();
    //   // var a_USDT = await ctx.USDT.methods.balanceOf(project).call();
    //   // console.log("a_baseReserve:" + a_baseReserve + " a_quoteReserve:" + a_quoteReserve + " a_dlp:" + a_dlp + " a_DODO:" + a_DODO + " a_USDT:" + a_USDT);
    //   // assert.equal(a_baseReserve, decimalStr("99900"));
    //   // assert.equal(a_quoteReserve, mweiStr("29970"));
    //   // assert.equal(a_dlp, decimalStr("99900"));
    //   // assert.equal(a_DODO, decimalStr("900100"));
    //   // assert.equal(a_USDT, mweiStr("940030"));
    // });

  });
});
