/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import * as assert from 'assert';
import BigNumber from 'bignumber.js';
import { DODOContext, getDODOContext } from '../utils-v1/Context-route';
import { decimalStr,MAX_UINT256,fromWei,mweiStr} from '../utils-v1/Converter';
import { logGas } from '../utils-v1/Log';
import { DODOHelper } from '../utils-v1/dodoHelper';

let lp: string;
let trader: string;

async function initDODO_USDT(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(ctx.DODO_USDT_ORACLE,mweiStr("0.1"));
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];
  
  let DODO = ctx.DODO;
  let USDT = ctx.USDT;
  let DODO_USDT = ctx.DODO_USDT;
  await ctx.approvePair(DODO,USDT,DODO_USDT.options.address,lp);
  await ctx.approvePair(DODO,USDT,DODO_USDT.options.address,trader);

  await ctx.mintToken(DODO,USDT, lp, decimalStr("10000"), mweiStr("1000"));
  await ctx.mintToken(DODO,USDT,trader, decimalStr("100"), mweiStr("0"));

  await DODO_USDT.methods
    .depositBaseTo(lp, decimalStr("10000"))
    .send(ctx.sendParam(lp));
  await DODO_USDT.methods
    .depositQuoteTo(lp, mweiStr("1000"))
    .send(ctx.sendParam(lp));
}

async function initUSDT_USDC(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(ctx.USDT_USDC_ORACLE,decimalStr("1"));
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];
  
  let USDT = ctx.USDT;
  let USDC = ctx.USDC;
  let USDT_USDC = ctx.USDT_USDC;

  await ctx.approvePair(USDT,USDC,USDT_USDC.options.address,lp);
  await ctx.mintToken(USDT,USDC,lp, mweiStr("1000"), mweiStr("1000"));

  await USDT_USDC.methods
    .depositBaseTo(lp, mweiStr("1000"))
    .send(ctx.sendParam(lp));
  await USDT_USDC.methods
    .depositQuoteTo(lp, mweiStr("1000"))
    .send(ctx.sendParam(lp));
}

async function initWETH_USDC(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(ctx.WETH_USDC_ORACLE,mweiStr("450"));
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];
  
  let WETH = ctx.WETH;
  let USDC = ctx.USDC;
  let WETH_USDC = ctx.WETH_USDC;

  await ctx.approvePair(WETH,USDC,WETH_USDC.options.address,lp);
  await ctx.mintToken(WETH,USDC,lp, decimalStr("1000"), mweiStr("450000"));

  await WETH_USDC.methods
    .depositBaseTo(lp, decimalStr("1000"))
    .send(ctx.sendParam(lp));
  await WETH_USDC.methods
    .depositQuoteTo(lp, mweiStr("450000"))
    .send(ctx.sendParam(lp));
}

//mock sdk logic
async function calcRoute(ctx: DODOContext,fromTokenAmount:string,slippage:number,routes:any[],pairs:any[]) {
  let swapAmount = fromTokenAmount

  let callPairs: string[] = []
  let datas: string = ""
  let starts: number[] = []
  let gAndV: number[] = []
  for (let i = 0; i < pairs.length; i++) {
    if(i == 0){
      starts.push(0);
    }
    let curPair = pairs[i]
    let curContact =pairs[i].pairContract;
    let curData = '';
    let curApproveData = '';

    if (curPair.base === routes[i].address) {
      curApproveData = await pairs[i].baseContract.methods.approve(curPair.pair,swapAmount).encodeABI()
      curApproveData = curApproveData.substring(2,curApproveData.length)
      datas += curApproveData
      starts.push(datas.length/2)
      gAndV.push(0)
      callPairs.push(pairs[i].baseContract.options.address);
      curData = await curContact.methods.sellBaseToken(swapAmount, 0, "0x").encodeABI()
      console.log(i + ":b-for-swapAmount:",swapAmount);
      swapAmount = await curContact.methods.querySellBaseToken(swapAmount).call();
      console.log(i + ":a-for-swapAmount:",swapAmount);
    } else {
      //TODO: approve的逻辑？
      curApproveData = await pairs[i].quoteContract.methods.approve(curPair.pair,swapAmount).encodeABI()
      curApproveData = curApproveData.substring(2,curApproveData.length)
      datas += curApproveData
      starts.push(datas.length/2)
      gAndV.push(0)
      callPairs.push(pairs[i].quoteContract.options.address);
      console.log(i + ":b-for-swapAmount:",swapAmount);
      let baseDecimal = await pairs[i].baseContract.methods.decimals().call();
      let quoteDecimal = await pairs[i].quoteContract.methods.decimals().call();
      let curPairDetail = {
        B: new BigNumber(await curContact.methods._BASE_BALANCE_().call() / 10 ** baseDecimal),
        Q: new BigNumber(await curContact.methods._QUOTE_BALANCE_().call() / 10 ** quoteDecimal),
        B0: new BigNumber(await curContact.methods._TARGET_BASE_TOKEN_AMOUNT_().call() / 10 ** baseDecimal),
        Q0: new BigNumber(await curContact.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call() / 10 ** quoteDecimal),
        RStatus: await curContact.methods._R_STATUS_().call(),
        OraclePrice: new BigNumber(await curContact.methods.getOraclePrice().call() / 10 ** (18-baseDecimal + quoteDecimal)),
        k: new BigNumber(parseInt(ctx.k) / 1e18),
        mtFeeRate: new BigNumber(parseInt(ctx.mtFeeRate) / 1e18),
        lpFeeRate: new BigNumber(parseInt(ctx.lpFeeRate) / 1e18)
      }
      let dodoHelper = new DODOHelper(curPairDetail)
      let tmpamount = dodoHelper.queryBuyQuote(new BigNumber(fromWei(swapAmount,'mwei'))).toString();
      swapAmount = decimalStr(tmpamount);
      curData = await curContact.methods.buyBaseToken(swapAmount, 0, "0x").encodeABI()
      console.log(i + ":a-for-swapAmount:",swapAmount);
    }
    curData = curData.substring(2,curData.length)
    datas += curData
    starts.push(datas.length/2)
    gAndV.push(0)
    callPairs.push(curPair.pair)
  }
  datas = "0x" + datas;
  let toAmount  = new BigNumber(swapAmount).multipliedBy(1-slippage).toFixed(0, BigNumber.ROUND_DOWN)
  return ctx.SmartSwap.methods.dodoSwap(
    routes[0].address,
    routes[routes.length-1].address,
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
    await initDODO_USDT(ctx);
    await initUSDT_USDC(ctx);
    await initWETH_USDC(ctx);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("route calc test", () => {
    it("DODO to USDT directly swap", async () => {
      var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var b_USDT = await ctx.USDT.methods.balanceOf(trader).call()
      console.log("Before DODO:" + fromWei(b_DODO,'ether') + "; USDT:" + fromWei(b_USDT,'mwei'));
      //approve DODO entry
      await ctx.DODO.methods.approve(ctx.SmartApprove.options.address,MAX_UINT256).send(ctx.sendParam(trader))
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
        /*only for test*/
        pairContract: ctx.DODO_USDT,
        baseContract: ctx.DODO,
        quoteContract: ctx.USDT
        /**************/
      }];

      var tx = await logGas(await calcRoute(ctx,decimalStr('10'),0.1,routes,pairs), ctx.sendParam(trader), "route swap")
      // console.log(tx.events['Swapped']);
      var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var a_USDT = await ctx.USDT.methods.balanceOf(trader).call()
      console.log("After DODO:" + fromWei(a_DODO,'ether') + "; USDT:" + fromWei(a_USDT,'mwei'));
    });


    it("DODO to USDC two hops swap", async () => {
      var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var b_USDC = await ctx.USDC.methods.balanceOf(trader).call()
      console.log("Before DODO:" + fromWei(b_DODO,'ether') + "; USDC:" + fromWei(b_USDC,'mwei'));
      //approve DODO entry
      await ctx.DODO.methods.approve(ctx.SmartApprove.options.address,MAX_UINT256).send(ctx.sendParam(trader))
      //set route path
      var routes = [{
        address: ctx.DODO.options.address,
        decimals: 18
      },{
        address: ctx.USDT.options.address,
        decimals: 6
      },{
        address: ctx.USDC.options.address,
        decimals: 6
      }];

      var pairs = [{
        pair: ctx.DODO_USDT.options.address,
        base: ctx.DODO.options.address,
        /*only for test*/
        pairContract: ctx.DODO_USDT,
        baseContract: ctx.DODO,
        quoteContract: ctx.USDT
        /**************/
      },{
        pair: ctx.USDT_USDC.options.address,
        base: ctx.USDT.options.address,
        /*only for test*/
        pairContract: ctx.USDT_USDC,
        baseContract: ctx.USDT,
        quoteContract: ctx.USDC
        /**************/
      }];

      var tx = await logGas(await calcRoute(ctx,decimalStr('10'),0.1,routes,pairs), ctx.sendParam(trader), "route swap")
      // console.log(tx.events['Swapped']);
      var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var a_USDC = await ctx.USDC.methods.balanceOf(trader).call()
      console.log("After DODO:" + fromWei(a_DODO,'ether') + "; USDC:" + fromWei(a_USDC,'mwei'));
    });



    it("DODO to WETH three hops swap", async () => {
      var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var b_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      console.log("Before DODO:" + fromWei(b_DODO,'ether') + "; WETH:" + fromWei(b_WETH,'ether'));
      //approve DODO entry
      await ctx.DODO.methods.approve(ctx.SmartApprove.options.address,MAX_UINT256).send(ctx.sendParam(trader))
      //set route path
      var routes = [{
        address: ctx.DODO.options.address,
        decimals: 18
      },{
        address: ctx.USDT.options.address,
        decimals: 6
      },{
        address: ctx.USDC.options.address,
        decimals: 6
      },{
        address: ctx.WETH.options.address,
        decimals: 18
      }];

      var pairs = [{
        pair: ctx.DODO_USDT.options.address,
        base: ctx.DODO.options.address,
        /*only for test*/
        pairContract: ctx.DODO_USDT,
        baseContract: ctx.DODO,
        quoteContract: ctx.USDT
        /**************/
      },{
        pair: ctx.USDT_USDC.options.address,
        base: ctx.USDT.options.address,
        /*only for test*/
        pairContract: ctx.USDT_USDC,
        baseContract: ctx.USDT,
        quoteContract: ctx.USDC
        /**************/
      },{
        pair: ctx.WETH_USDC.options.address,
        base: ctx.WETH.options.address,
        /*only for test*/
        pairContract: ctx.WETH_USDC,
        baseContract: ctx.WETH,
        quoteContract: ctx.USDC
        /**************/
      }];

      var tx = await logGas(await calcRoute(ctx,decimalStr('10'),0.1,routes,pairs), ctx.sendParam(trader), "route swap")
      // console.log(tx.events['Swapped']);
      var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
      var a_WETH = await ctx.WETH.methods.balanceOf(trader).call()
      console.log("After DODO:" + fromWei(a_DODO,'ether') + "; WETH:" + fromWei(a_WETH,'ether'));
    });
  });
});
