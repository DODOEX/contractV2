/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from 'bignumber.js';
import { DODOContext, getDODOContext } from '../utils-v1/ProxyContextV1';
import { decimalStr, MAX_UINT256, fromWei, mweiStr } from '../utils-v1/Converter';
import { logGas } from '../utils-v1/Log';
import * as contracts from '../utils-v1/Contracts';
import { assert } from 'chai';

let lp: string;
let trader: string;

async function initDODO_USDT(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(ctx.DODO_USDT_ORACLE, mweiStr("0.1"));
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];

  let DODO = ctx.DODO;
  let USDT = ctx.USDT;
  let DODO_USDT = ctx.DODO_USDT;
  await ctx.approvePair(DODO, USDT, DODO_USDT.options.address, lp);
  await ctx.approvePair(DODO, USDT, DODO_USDT.options.address, trader);

  await ctx.mintToken(DODO, USDT, lp, decimalStr("10000000"), mweiStr("1000000"));
  await ctx.mintToken(DODO, USDT, trader, decimalStr("1000"), mweiStr("0"));

  await DODO_USDT.methods
    .depositBaseTo(lp, decimalStr("10000000"))
    .send(ctx.sendParam(lp));
  await DODO_USDT.methods
    .depositQuoteTo(lp, mweiStr("1000000"))
    .send(ctx.sendParam(lp));
}

async function initUSDT_USDC(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(ctx.USDT_USDC_ORACLE, decimalStr("1"));
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];

  let USDT = ctx.USDT;
  let USDC = ctx.USDC;
  let USDT_USDC = ctx.USDT_USDC;

  await ctx.approvePair(USDT, USDC, USDT_USDC.options.address, lp);
  await ctx.mintToken(USDT, USDC, lp, mweiStr("1000000"), mweiStr("1000000"));

  await USDT_USDC.methods
    .depositBaseTo(lp, mweiStr("1000000"))
    .send(ctx.sendParam(lp));
  await USDT_USDC.methods
    .depositQuoteTo(lp, mweiStr("1000000"))
    .send(ctx.sendParam(lp));
}


async function initWETH_USDC(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(ctx.WETH_USDC_ORACLE, mweiStr("450"));
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];

  let WETH = ctx.WETH;
  let USDC = ctx.USDC;
  let WETH_USDC = ctx.WETH_USDC;

  await ctx.approvePair(WETH, USDC, WETH_USDC.options.address, lp);
  await ctx.mintToken(null, USDC, lp, decimalStr("0"), mweiStr("3600"));
  await WETH.methods.deposit().send(ctx.sendParam(lp, '8'));

  await WETH_USDC.methods
    .depositBaseTo(lp, decimalStr("8"))
    .send(ctx.sendParam(lp));
  await WETH_USDC.methods
    .depositQuoteTo(lp, mweiStr("3600"))
    .send(ctx.sendParam(lp));
}

//mock sdk logic
async function calcRoute(ctx: DODOContext, fromTokenAmount: string, slippage: number, routes: any[], pairs: any[]) {
  let swapAmount = fromTokenAmount
  let directions: number[] = []
  let dodoPairs: string[] = []


  for (let i = 0; i < pairs.length; i++) {
    let curPair = pairs[i]
    dodoPairs.push(curPair.pair)
    let curContact = pairs[i].pairContract
    if (routes[i].address == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      directions[i] = 0;
      swapAmount = await curContact.methods.querySellBaseToken(swapAmount).call();
      // console.log(i + "-swapAmount:", swapAmount);
    } else if (curPair.base === routes[i].address) {
      directions[i] = 0;
      swapAmount = await curContact.methods.querySellBaseToken(swapAmount).call();
      // console.log(i + "-swapAmount:", swapAmount);
    } else {
      directions[i] = 1;
      swapAmount = await ctx.DODOSellHelper.methods.querySellQuoteToken(curPair.pair, swapAmount).call();
      // console.log(i + "-swapAmount:", swapAmount);
    }
  }

  var [returmAmount, midPrices] = await ctx.DODOSwapCalcHelper.methods.calcReturnAmountV1(
    fromTokenAmount,
    dodoPairs,
    directions,
  ).call();
  console.log("returnAmount:", returmAmount)
  console.log("localAmount:", swapAmount)
  console.log("midPrices:", midPrices)


  let toAmount = new BigNumber(swapAmount).multipliedBy(1 - slippage).toFixed(0, BigNumber.ROUND_DOWN)
  // console.log("minAmount:",toAmount);
  let deadline = Math.floor(new Date().getTime() / 1000 + 60 * 10);

  return ctx.DODOV1Proxy01.methods.dodoSwapV1(
    routes[0].address,
    routes[routes.length - 1].address,
    fromTokenAmount,
    toAmount,
    dodoPairs,
    directions,
    deadline
  )
}

describe("Trader", () => {
  let snapshotId: string;
  let ctx: DODOContext;

  before(async () => {
    console.log("Confirm DODOApprove's current Proxy version!");
    let ETH = await contracts.newContract(
      contracts.WETH_CONTRACT_NAME
    );
    ctx = await getDODOContext(ETH.options.address);
    await initDODO_USDT(ctx);
    await initUSDT_USDC(ctx);
    await initWETH_USDC(ctx);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    // await ctx.EVM.reset(snapshotId);
  });

  describe("route calc test", () => {
    it("DODO to USDT directly swap", async () => {
      var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var b_USDT = await ctx.USDT.methods.balanceOf(trader).call()
      var c_b_CHI = await ctx.CHI.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; USDT:" + fromWei(b_USDT, 'mwei'));
      //approve DODO entry
      await ctx.DODO.methods.approve(ctx.DODOApprove.options.address, MAX_UINT256).send(ctx.sendParam(trader))
      //set route path
      var routes = [{
        address: ctx.DODO.options.address,
        decimals: 18
      },
      {
        address: ctx.USDT.options.address,
        decimals: 6
      }];

      var pairs = [{
        pair: ctx.DODO_USDT.options.address,
        base: ctx.DODO.options.address,
        pairContract: ctx.DODO_USDT
      }];

      await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs), ctx.sendParam(trader), "directly swap")
      var tx = await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs), ctx.sendParam(trader), "directly swap")
      console.log(tx.transactionHash);
      var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var a_USDT = await ctx.USDT.methods.balanceOf(trader).call()
      console.log("After DODO:" + fromWei(a_DODO, 'ether') + "; USDT:" + fromWei(a_USDT, 'mwei'));
      console.log("===============================================")
      var c_DODO = await ctx.DODO.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDT = await ctx.USDT.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_a_CHI = await ctx.CHI.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      console.log("Contract DODO:" + fromWei(c_DODO, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei'));
      console.log("Contract gas Token Before:" + c_b_CHI + " ;After:" + c_a_CHI);
      // console.log("USDT:" + a_USDT);
      assert(a_USDT, "1994000");
    });


    it("DODO to USDC two hops swap", async () => {
      var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var b_USDC = await ctx.USDC.methods.balanceOf(trader).call()
      console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; USDC:" + fromWei(b_USDC, 'mwei'));
      //approve DODO entry
      await ctx.DODO.methods.approve(ctx.DODOApprove.options.address, MAX_UINT256).send(ctx.sendParam(trader))
      //set route path
      var routes = [{
        address: ctx.DODO.options.address,
        decimals: 18
      }, {
        address: ctx.USDT.options.address,
        decimals: 6
      }, {
        address: ctx.USDC.options.address,
        decimals: 6
      }];

      var pairs = [{
        pair: ctx.DODO_USDT.options.address,
        base: ctx.DODO.options.address,
        pairContract: ctx.DODO_USDT
      }, {
        pair: ctx.USDT_USDC.options.address,
        base: ctx.USDT.options.address,
        pairContract: ctx.USDT_USDC
      }];

      var tx = await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs), ctx.sendParam(trader), "two hops swap")
      var tx = await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs), ctx.sendParam(trader), "two hops swap")
      // console.log(tx.events['Swapped']);
      var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var a_USDC = await ctx.USDC.methods.balanceOf(trader).call()
      console.log("After DODO:" + fromWei(a_DODO, 'ether') + "; USDC:" + fromWei(a_USDC, 'mwei'));
      console.log("===============================================")
      var c_DODO = await ctx.DODO.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDT = await ctx.USDT.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDC = await ctx.USDC.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      console.log("Contract DODO:" + fromWei(c_DODO, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei'));
      // console.log("USDC:" + a_USDC);
      assert(a_USDC, "1988019");
    });

    it("DODO to WETH three hops swap", async () => {
      var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether'));
      //approve DODO entry
      await ctx.DODO.methods.approve(ctx.DODOApprove.options.address, MAX_UINT256).send(ctx.sendParam(trader))
      //set route path
      var routes = [{
        address: ctx.DODO.options.address,
        decimals: 18
      }, {
        address: ctx.USDT.options.address,
        decimals: 6
      }, {
        address: ctx.USDC.options.address,
        decimals: 6
      }, {
        address: ctx.WETH.options.address,
        decimals: 18
      }];

      var pairs = [{
        pair: ctx.DODO_USDT.options.address,
        base: ctx.DODO.options.address,
        pairContract: ctx.DODO_USDT
      }, {
        pair: ctx.USDT_USDC.options.address,
        base: ctx.USDT.options.address,
        pairContract: ctx.USDT_USDC
      }, {
        pair: ctx.WETH_USDC.options.address,
        base: ctx.WETH.options.address,
        pairContract: ctx.WETH_USDC
      }];

      var tx = await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs), ctx.sendParam(trader), "three hops swap")
      var tx = await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs), ctx.sendParam(trader), "three hops swap")
      console.log(tx.events['TestAmount']);
      var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      console.log("After DODO:" + fromWei(a_DODO, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether'));
      console.log("===============================================")
      var c_DODO = await ctx.DODO.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDT = await ctx.USDT.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDC = await ctx.USDC.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_WETH = await ctx.WETH.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      console.log("Contract DODO:" + fromWei(c_DODO, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei') + "; WETH:" + fromWei(c_WETH, 'ether'));
      // console.log("WETH:" + a_WETH);
      assert(a_WETH, "4404365055045800");
    });


    it("ETH to USDC wrap eth and directly swap", async () => {
      var b_ETH = await ctx.Web3.eth.getBalance(trader)
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      var b_USDC = await ctx.USDC.methods.balanceOf(trader).call()
      console.log("Before ETH:" + fromWei(b_ETH, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether') + "; USDC:" + fromWei(b_USDC, 'mwei'));
      var b_w_eth = await ctx.Web3.eth.getBalance(ctx.WETH.options.address)
      console.log("weth contract Before:" + fromWei(b_w_eth, 'ether'))
      //set route path
      var routes = [{
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        decimals: 18
      }, {
        address: ctx.USDC.options.address,
        decimals: 6
      }];

      var pairs = [{
        pair: ctx.WETH_USDC.options.address,
        base: ctx.WETH.options.address,
        pairContract: ctx.WETH_USDC
      }];

      var tx = await logGas(await calcRoute(ctx, decimalStr('1'), 0.1, routes, pairs), ctx.sendParam(trader, '1'), "wrap eth and directly swap")
      var tx = await logGas(await calcRoute(ctx, decimalStr('1'), 0.1, routes, pairs), ctx.sendParam(trader, '1'), "wrap eth and directly swap")
      var a_ETH = await ctx.Web3.eth.getBalance(trader)
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      var a_USDC = await ctx.USDC.methods.balanceOf(trader).call()
      console.log("After ETH:" + fromWei(a_ETH, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether') + "; USDC:" + fromWei(a_USDC, 'mwei'));
      console.log("===============================================")
      var c_ETH = await ctx.Web3.eth.getBalance(ctx.DODOV1Proxy01.options.address)
      var c_WETH = await ctx.WETH.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDT = await ctx.USDT.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDC = await ctx.USDC.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      console.log("Contract ETH:" + fromWei(c_ETH, 'ether') + "; WETH:" + fromWei(c_WETH, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei'));
      var a_w_eth = await ctx.Web3.eth.getBalance(ctx.WETH.options.address)
      console.log("weth contract After:" + fromWei(a_w_eth, 'ether'))
      assert(a_USDC, "869508322");
    });


    it("ETH to USDT wrap eth and two hops swap", async () => {
      var b_ETH = await ctx.Web3.eth.getBalance(trader)
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      var b_USDT = await ctx.USDT.methods.balanceOf(trader).call()
      console.log("Before ETH:" + fromWei(b_ETH, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether') + "; USDT:" + fromWei(b_USDT, 'mwei'));
      var b_w_eth = await ctx.Web3.eth.getBalance(ctx.WETH.options.address)
      console.log("weth contract Before:" + fromWei(b_w_eth, 'ether'))
      //set route path
      var routes = [{
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        decimals: 18
      }, {
        address: ctx.USDC.options.address,
        decimals: 6
      }, {
        address: ctx.USDT.options.address,
        decimals: 6
      }];

      var pairs = [{
        pair: ctx.WETH_USDC.options.address,
        base: ctx.WETH.options.address,
        pairContract: ctx.WETH_USDC
      }, {
        pair: ctx.USDT_USDC.options.address,
        base: ctx.USDT.options.address,
        pairContract: ctx.USDT_USDC
      }];

      var tx = await logGas(await calcRoute(ctx, decimalStr('1'), 0.1, routes, pairs), ctx.sendParam(trader, '1'), "wrap eth and two hops swap")
      var tx = await logGas(await calcRoute(ctx, decimalStr('1'), 0.1, routes, pairs), ctx.sendParam(trader, '1'), "wrap eth and two hops swap")
      var a_ETH = await ctx.Web3.eth.getBalance(trader)
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      var a_USDT = await ctx.USDT.methods.balanceOf(trader).call()
      console.log("After ETH:" + fromWei(a_ETH, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether') + "; USDT:" + fromWei(a_USDT, 'mwei'));
      console.log("===============================================")
      var c_ETH = await ctx.Web3.eth.getBalance(ctx.DODOV1Proxy01.options.address)
      var c_WETH = await ctx.WETH.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDT = await ctx.USDT.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDC = await ctx.USDC.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      console.log("Contract ETH:" + fromWei(c_ETH, 'ether') + "; WETH:" + fromWei(c_WETH, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei'));
      var a_w_eth = await ctx.Web3.eth.getBalance(ctx.WETH.options.address)
      console.log("weth contract After:" + fromWei(a_w_eth, 'ether'))
      // console.log("USDT:" + a_USDT);
      assert(a_USDT, "866832169");
    });


    it("DODO to ETH unwrap eth and three hops swap", async () => {
      var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var b_ETH = await ctx.Web3.eth.getBalance(trader)
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      console.log("User Before ETH:" + fromWei(b_ETH, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether') + "; DODO:" + fromWei(b_DODO, 'ether'));
      var b_w_eth = await ctx.Web3.eth.getBalance(ctx.WETH.options.address)
      console.log("weth contract Before:" + fromWei(b_w_eth, 'ether'))

      //approve DODO entry
      await ctx.DODO.methods.approve(ctx.DODOApprove.options.address, MAX_UINT256).send(ctx.sendParam(trader))
      //set route path
      var routes = [{
        address: ctx.DODO.options.address,
        decimals: 18
      }, {
        address: ctx.USDT.options.address,
        decimals: 6
      }, {
        address: ctx.USDC.options.address,
        decimals: 6
      }, {
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        decimals: 18
      }];

      var pairs = [{
        pair: ctx.DODO_USDT.options.address,
        base: ctx.DODO.options.address,
        pairContract: ctx.DODO_USDT
      }, {
        pair: ctx.USDT_USDC.options.address,
        base: ctx.USDT.options.address,
        pairContract: ctx.USDT_USDC
      }, {
        pair: ctx.WETH_USDC.options.address,
        base: ctx.WETH.options.address,
        pairContract: ctx.WETH_USDC
      }];

      var tx = await logGas(await calcRoute(ctx, decimalStr('100'), 0.1, routes, pairs), ctx.sendParam(trader), "unwrap eth and three hops swap")
      var tx = await logGas(await calcRoute(ctx, decimalStr('100'), 0.1, routes, pairs), ctx.sendParam(trader), "unwrap eth and three hops swap")
      var a_ETH = await ctx.Web3.eth.getBalance(trader)
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      console.log("After ETH:" + fromWei(a_ETH, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether') + "; DODO:" + fromWei(a_DODO, 'ether'));
      console.log("===============================================")
      var c_ETH = await ctx.Web3.eth.getBalance(ctx.DODOV1Proxy01.options.address)
      var c_WETH = await ctx.WETH.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDT = await ctx.USDT.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_USDC = await ctx.USDC.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      var c_DODO = await ctx.DODO.methods.balanceOf(ctx.DODOV1Proxy01.options.address).call()
      console.log("Contract ETH:" + fromWei(c_ETH, 'ether') + "; WETH:" + fromWei(c_WETH, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei') + "; DODO:" + fromWei(c_DODO, "ether"));
      var w_eth = await ctx.Web3.eth.getBalance(ctx.WETH.options.address)
      console.log("weth contract After:" + fromWei(w_eth, 'ether'))
      // console.log("ETH returmAmount:" + tx.events['OrderHistory'].returnValues['returnAmount']);
      assert(tx.events['OrderHistory'].returnValues['returnAmount'], "22004556829826281");
    });

  });
});
