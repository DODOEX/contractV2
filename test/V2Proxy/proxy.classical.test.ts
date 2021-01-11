/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from 'bignumber.js';
import { assert } from 'chai';
import { DODOContext, getDODOContext } from '../utils-v1/ProxyContextV1';
import { ProxyContext, getProxyContext } from '../utils/ProxyContextV2';
import { decimalStr, MAX_UINT256, fromWei, mweiStr } from '../utils-v1/Converter';
import { logGas } from '../utils-v1/Log';
import * as contracts from '../utils-v1/Contracts';
import { Contract } from 'web3-eth-contract';

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
    await ctx.mintToken(DODO, USDT, trader, decimalStr("1000"), mweiStr("1000"));

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
    await ctx.mintToken(null, USDC, trader, decimalStr("0"), mweiStr("100"));
    await WETH.methods.deposit().send(ctx.sendParam(lp, '8'));

    await WETH_USDC.methods
        .depositBaseTo(lp, decimalStr("8"))
        .send(ctx.sendParam(lp));
    await WETH_USDC.methods
        .depositQuoteTo(lp, mweiStr("3600"))
        .send(ctx.sendParam(lp));
}

//mock sdk logic
async function calcRoute(ctx: ProxyContext, fromTokenAmount: string, slippage: number, routes: any[], pairs: any[]) {
    let swapAmount = fromTokenAmount
    let tmpDirections: number[] = []
    let strDirections: string = ''
    let dodoPairs: string[] = []


    for (let i = 0; i < pairs.length; i++) {
        let curPair = pairs[i]
        dodoPairs.push(curPair.pair)
        let curContact = pairs[i].pairContract
        if (routes[i].address == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
            tmpDirections[i] = 0;
            swapAmount = await curContact.methods.querySellBaseToken(swapAmount).call();
        } else if (curPair.base === routes[i].address) {
            tmpDirections[i] = 0;
            swapAmount = await curContact.methods.querySellBaseToken(swapAmount).call();
        } else {
            tmpDirections[i] = 1;
            swapAmount = await ctx.DODOSellHelper.methods.querySellQuoteToken(curPair.pair, swapAmount).call();
        }
    }

    for (let i = tmpDirections.length - 1; i >= 0; i--) {
        strDirections += tmpDirections[i].toString()
    }


    let toAmount = new BigNumber(swapAmount).multipliedBy(1 - slippage).toFixed(0, BigNumber.ROUND_DOWN)
    let deadline = Math.floor(new Date().getTime() / 1000 + 60 * 10);

    return ctx.DODOProxyV2.methods.dodoSwapV1(
        routes[0].address,
        routes[routes.length - 1].address,
        fromTokenAmount,
        toAmount,
        dodoPairs,
        parseInt(strDirections,2),
        false,
        deadline
    )
}

describe("AddLiquidity", () => {
    let snapshotId1: string;
    let snapshotId2: string;
    let ctxV1: DODOContext;
    let ctxV2: ProxyContext;
    let DODO_LP: Contract;
    let WETH_LP: Contract;
    let USDT_LP: Contract;
    let USDC_LP: Contract;

    before(async () => {
        let ETH = await contracts.newContract(
            contracts.WETH_CONTRACT_NAME
        );
        ctxV1 = await getDODOContext(ETH.options.address);
        ctxV2 = await getProxyContext(ETH.options.address);
        await initDODO_USDT(ctxV1);
        await initUSDT_USDC(ctxV1);
        await initWETH_USDC(ctxV1);
        var dodo_dlp = await ctxV1.DODO_USDT.methods._BASE_CAPITAL_TOKEN_().call();
        var usdt_dlp = await ctxV1.DODO_USDT.methods._QUOTE_CAPITAL_TOKEN_().call();
        DODO_LP = contracts.getContractWithAddress(contracts.DODO_LP_TOKEN_CONTRACT_NAME, dodo_dlp);
        USDT_LP = contracts.getContractWithAddress(contracts.DODO_LP_TOKEN_CONTRACT_NAME, usdt_dlp);

        var weth_dlp = await ctxV1.WETH_USDC.methods._BASE_CAPITAL_TOKEN_().call();
        var usdc_dlp = await ctxV1.WETH_USDC.methods._QUOTE_CAPITAL_TOKEN_().call();
        WETH_LP = contracts.getContractWithAddress(contracts.DODO_LP_TOKEN_CONTRACT_NAME, weth_dlp);
        USDC_LP = contracts.getContractWithAddress(contracts.DODO_LP_TOKEN_CONTRACT_NAME, usdc_dlp);
    });

    beforeEach(async () => {
        snapshotId1 = await ctxV1.EVM.snapshot();
        snapshotId2 = await ctxV2.EVM.snapshot();
    });

    afterEach(async () => {
        await ctxV1.EVM.reset(snapshotId1);
        await ctxV2.EVM.reset(snapshotId2);
    });

    describe("AddLiquidity", () => {
        it("AddLiquidity", async () => {
            var b_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var b_USDT = await ctxV1.USDT.methods.balanceOf(trader).call()
            var dodo_lp = await DODO_LP.methods.balanceOf(trader).call()
            var usdt_lp = await USDT_LP.methods.balanceOf(trader).call()
            console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; USDT:" + fromWei(b_USDT, 'mwei'));
            console.log("dodo_lp:" + dodo_lp + " usdt_lp:" + usdt_lp);
            await ctxV1.DODO.methods.approve(ctxV2.DODOApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader));
            await ctxV1.USDT.methods.approve(ctxV2.DODOApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader));
            await logGas(await ctxV2.DODOProxyV2.methods.addLiquidityToV1(
                ctxV1.DODO_USDT.options.address,
                decimalStr("100"),
                mweiStr("100"),
                0,
                0,
                0,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctxV2.sendParam(trader), "addLiquidity");
            var dodo_lp = await DODO_LP.methods.balanceOf(trader).call()
            var usdt_lp = await USDT_LP.methods.balanceOf(trader).call()
            var a_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var a_USDT = await ctxV1.USDT.methods.balanceOf(trader).call()
            console.log("After DODO:" + fromWei(a_DODO, 'ether') + "; USDT:" + fromWei(a_USDT, 'mwei'));
            assert.equal(dodo_lp,decimalStr("100"));
            assert.equal(usdt_lp,mweiStr("100"));
            assert.equal(a_DODO,decimalStr("900"));
            assert.equal(a_USDT,mweiStr("900"));
        });

        it("AddLiquidity - ETH", async () => {
            var b_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            var b_USDC = await ctxV1.USDC.methods.balanceOf(trader).call()
            var b_ETH = await ctxV2.Web3.eth.getBalance(trader);
            var weth_lp = await WETH_LP.methods.balanceOf(trader).call()
            var usdc_lp = await USDC_LP.methods.balanceOf(trader).call()
            console.log("Before WETH:" + fromWei(b_WETH, 'ether') + "; USDC:" + fromWei(b_USDC, 'mwei') + "; ETH:" + fromWei(b_ETH, 'ether'));
            console.log("weth_lp:" + weth_lp + " usdc_lp:" + usdc_lp);
            await ctxV1.USDC.methods.approve(ctxV2.DODOApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader));
            await logGas(await ctxV2.DODOProxyV2.methods.addLiquidityToV1(
                ctxV1.WETH_USDC.options.address,
                decimalStr("1"),
                mweiStr("100"),
                0,
                0,
                1,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctxV2.sendParam(trader,"1"), "addLiquidity - eth");
            var weth_lp = await WETH_LP.methods.balanceOf(trader).call()
            var usdc_lp = await USDC_LP.methods.balanceOf(trader).call()
            var a_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            var a_USDC = await ctxV1.USDC.methods.balanceOf(trader).call()
            var a_ETH = await ctxV2.Web3.eth.getBalance(trader);
            console.log("After WETH:" + fromWei(a_WETH, 'ether') + "; USDC:" + fromWei(a_USDC, 'mwei') + "; ETH:" + fromWei(a_ETH, 'ether'));
            assert.equal(weth_lp,decimalStr("1"));
            assert.equal(usdc_lp,mweiStr("100"));
        });


        it("DODO to USDT directly swap", async () => {
            var b_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var b_USDT = await ctxV1.USDT.methods.balanceOf(trader).call()
            console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; USDT:" + fromWei(b_USDT, 'mwei'));
            //approve DODO entry
            await ctxV1.DODO.methods.approve(ctxV2.DODOApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader))
            //set route path
            var routes = [{
                address: ctxV1.DODO.options.address,
                decimals: 18
            },
            {
                address: ctxV1.USDT.options.address,
                decimals: 6
            }];

            var pairs = [{
                pair: ctxV1.DODO_USDT.options.address,
                base: ctxV1.DODO.options.address,
                pairContract: ctxV1.DODO_USDT
            }];

            await logGas(await calcRoute(ctxV2, decimalStr('10'), 0.1, routes, pairs), ctxV2.sendParam(trader), "directly swap first")
            await logGas(await calcRoute(ctxV2, decimalStr('10'), 0.1, routes, pairs), ctxV2.sendParam(trader), "directly swap second")
            // console.log(tx.events['OrderHistory']);
            var a_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var a_USDT = await ctxV1.USDT.methods.balanceOf(trader).call()
            console.log("After DODO:" + fromWei(a_DODO, 'ether') + "; USDT:" + fromWei(a_USDT, 'mwei'));
            console.log("===============================================")
            var c_DODO = await ctxV1.DODO.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDT = await ctxV1.USDT.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            console.log("Contract DODO:" + fromWei(c_DODO, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei'));
            assert(a_USDT, "1994000");
        });


        it("DODO to USDC two hops swap", async () => {
            var b_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var b_USDC = await ctxV1.USDC.methods.balanceOf(trader).call()
            console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; USDC:" + fromWei(b_USDC, 'mwei'));
            //approve DODO entry
            await ctxV1.DODO.methods.approve(ctxV2.DODOApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader))
            //set route path
            var routes = [{
                address: ctxV1.DODO.options.address,
                decimals: 18
            }, {
                address: ctxV1.USDT.options.address,
                decimals: 6
            }, {
                address: ctxV1.USDC.options.address,
                decimals: 6
            }];

            var pairs = [{
                pair: ctxV1.DODO_USDT.options.address,
                base: ctxV1.DODO.options.address,
                pairContract: ctxV1.DODO_USDT
            }, {
                pair: ctxV1.USDT_USDC.options.address,
                base: ctxV1.USDT.options.address,
                pairContract: ctxV1.USDT_USDC
            }];

            await logGas(await calcRoute(ctxV2, decimalStr('10'), 0.1, routes, pairs), ctxV2.sendParam(trader), "two hops swap first")
            await logGas(await calcRoute(ctxV2, decimalStr('10'), 0.1, routes, pairs), ctxV2.sendParam(trader), "two hops swap second")
            // console.log(tx.events['Swapped']);
            var a_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var a_USDC = await ctxV1.USDC.methods.balanceOf(trader).call()
            console.log("After DODO:" + fromWei(a_DODO, 'ether') + "; USDC:" + fromWei(a_USDC, 'mwei'));
            console.log("===============================================")
            var c_DODO = await ctxV1.DODO.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDT = await ctxV1.USDT.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDC = await ctxV1.USDC.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            console.log("Contract DODO:" + fromWei(c_DODO, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei'));
            assert(a_USDC, "1988019");
        });

        it("DODO to WETH three hops swap", async () => {
            var b_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var b_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether'));
            //approve DODO entry
            await ctxV1.DODO.methods.approve(ctxV2.DODOApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader))
            //set route path
            var routes = [{
                address: ctxV1.DODO.options.address,
                decimals: 18
            }, {
                address: ctxV1.USDT.options.address,
                decimals: 6
            }, {
                address: ctxV1.USDC.options.address,
                decimals: 6
            }, {
                address: ctxV1.WETH.options.address,
                decimals: 18
            }];

            var pairs = [{
                pair: ctxV1.DODO_USDT.options.address,
                base: ctxV1.DODO.options.address,
                pairContract: ctxV1.DODO_USDT
            }, {
                pair: ctxV1.USDT_USDC.options.address,
                base: ctxV1.USDT.options.address,
                pairContract: ctxV1.USDT_USDC
            }, {
                pair: ctxV1.WETH_USDC.options.address,
                base: ctxV1.WETH.options.address,
                pairContract: ctxV1.WETH_USDC
            }];

            var tx = await logGas(await calcRoute(ctxV2, decimalStr('10'), 0.1, routes, pairs), ctxV2.sendParam(trader), "three hops swap first")
            var tx = await logGas(await calcRoute(ctxV2, decimalStr('10'), 0.1, routes, pairs), ctxV2.sendParam(trader), "three hops swap second")
            console.log(tx.events['TestAmount']);
            var a_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var a_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            console.log("After DODO:" + fromWei(a_DODO, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether'));
            console.log("===============================================")
            var c_DODO = await ctxV1.DODO.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDT = await ctxV1.USDT.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDC = await ctxV1.USDC.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_WETH = await ctxV1.WETH.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            console.log("Contract DODO:" + fromWei(c_DODO, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei') + "; WETH:" + fromWei(c_WETH, 'ether'));
            assert(a_WETH, "4404365055045800");
        });


        it("ETH to USDT wrap eth and directly swap", async () => {
            var b_ETH = await ctxV1.Web3.eth.getBalance(trader)
            var b_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            var b_USDC = await ctxV1.USDC.methods.balanceOf(trader).call()
            console.log("Before ETH:" + fromWei(b_ETH, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether') + "; USDC:" + fromWei(b_USDC, 'mwei'));
            var b_w_eth = await ctxV1.Web3.eth.getBalance(ctxV1.WETH.options.address)
            console.log("weth contract Before:" + fromWei(b_w_eth, 'ether'))
            //set route path
            var routes = [{
                address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                decimals: 18
            }, {
                address: ctxV1.USDC.options.address,
                decimals: 6
            }];

            var pairs = [{
                pair: ctxV1.WETH_USDC.options.address,
                base: ctxV1.WETH.options.address,
                pairContract: ctxV1.WETH_USDC
            }];

            await logGas(await calcRoute(ctxV2, decimalStr('1'), 0.1, routes, pairs), ctxV2.sendParam(trader, '1'), "wrap eth and directly swap first")
            await logGas(await calcRoute(ctxV2, decimalStr('1'), 0.1, routes, pairs), ctxV2.sendParam(trader, '1'), "wrap eth and directly swap second")
            var a_ETH = await ctxV1.Web3.eth.getBalance(trader)
            var a_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            var a_USDC = await ctxV1.USDC.methods.balanceOf(trader).call()
            console.log("After ETH:" + fromWei(a_ETH, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether') + "; USDC:" + fromWei(a_USDC, 'mwei'));
            console.log("===============================================")
            var c_ETH = await ctxV1.Web3.eth.getBalance(ctxV2.DODOProxyV2.options.address)
            var c_WETH = await ctxV1.WETH.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDT = await ctxV1.USDT.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDC = await ctxV1.USDC.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            console.log("Contract ETH:" + fromWei(c_ETH, 'ether') + "; WETH:" + fromWei(c_WETH, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei'));
            var a_w_eth = await ctxV1.Web3.eth.getBalance(ctxV1.WETH.options.address)
            console.log("weth contract After:" + fromWei(a_w_eth, 'ether'))
            assert(a_USDC, "869508322");
        });


        it("ETH to USDT wrap eth and two hops swap", async () => {
            var b_ETH = await ctxV1.Web3.eth.getBalance(trader)
            var b_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            var b_USDT = await ctxV1.USDT.methods.balanceOf(trader).call()
            console.log("Before ETH:" + fromWei(b_ETH, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether') + "; USDT:" + fromWei(b_USDT, 'mwei'));
            var b_w_eth = await ctxV1.Web3.eth.getBalance(ctxV1.WETH.options.address)
            console.log("weth contract Before:" + fromWei(b_w_eth, 'ether'))
            //set route path
            var routes = [{
                address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                decimals: 18
            }, {
                address: ctxV1.USDC.options.address,
                decimals: 6
            }, {
                address: ctxV1.USDT.options.address,
                decimals: 6
            }];

            var pairs = [{
                pair: ctxV1.WETH_USDC.options.address,
                base: ctxV1.WETH.options.address,
                pairContract: ctxV1.WETH_USDC
            }, {
                pair: ctxV1.USDT_USDC.options.address,
                base: ctxV1.USDT.options.address,
                pairContract: ctxV1.USDT_USDC
            }];

            await logGas(await calcRoute(ctxV2, decimalStr('1'), 0.1, routes, pairs), ctxV2.sendParam(trader, '1'), "wrap eth and two hops swap first")
            await logGas(await calcRoute(ctxV2, decimalStr('1'), 0.1, routes, pairs), ctxV2.sendParam(trader, '1'), "wrap eth and two hops swap second")
            var a_ETH = await ctxV1.Web3.eth.getBalance(trader)
            var a_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            var a_USDT = await ctxV1.USDT.methods.balanceOf(trader).call()
            console.log("After ETH:" + fromWei(a_ETH, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether') + "; USDT:" + fromWei(a_USDT, 'mwei'));
            console.log("===============================================")
            var c_ETH = await ctxV1.Web3.eth.getBalance(ctxV2.DODOProxyV2.options.address)
            var c_WETH = await ctxV1.WETH.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDT = await ctxV1.USDT.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDC = await ctxV1.USDC.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            console.log("Contract ETH:" + fromWei(c_ETH, 'ether') + "; WETH:" + fromWei(c_WETH, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei'));
            var a_w_eth = await ctxV1.Web3.eth.getBalance(ctxV1.WETH.options.address)
            console.log("weth contract After:" + fromWei(a_w_eth, 'ether'))
            assert(a_USDT, "866832169");
        });


        it("DODO to ETH unwrap eth and three hops swap", async () => {
            var b_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            var b_ETH = await ctxV1.Web3.eth.getBalance(trader)
            var b_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            console.log("User Before ETH:" + fromWei(b_ETH, 'ether') + "; WETH:" + fromWei(b_WETH, 'ether') + "; DODO:" + fromWei(b_DODO, 'ether'));
            var b_w_eth = await ctxV1.Web3.eth.getBalance(ctxV1.WETH.options.address)
            console.log("weth contract Before:" + fromWei(b_w_eth, 'ether'))

            //approve DODO entry
            await ctxV1.DODO.methods.approve(ctxV2.DODOApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader))
            //set route path
            var routes = [{
                address: ctxV1.DODO.options.address,
                decimals: 18
            }, {
                address: ctxV1.USDT.options.address,
                decimals: 6
            }, {
                address: ctxV1.USDC.options.address,
                decimals: 6
            }, {
                address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                decimals: 18
            }];

            var pairs = [{
                pair: ctxV1.DODO_USDT.options.address,
                base: ctxV1.DODO.options.address,
                pairContract: ctxV1.DODO_USDT
            }, {
                pair: ctxV1.USDT_USDC.options.address,
                base: ctxV1.USDT.options.address,
                pairContract: ctxV1.USDT_USDC
            }, {
                pair: ctxV1.WETH_USDC.options.address,
                base: ctxV1.WETH.options.address,
                pairContract: ctxV1.WETH_USDC
            }];

            var tx = await logGas(await calcRoute(ctxV2, decimalStr('100'), 0.1, routes, pairs), ctxV2.sendParam(trader), "unwrap eth and three hops swap first")
            var tx = await logGas(await calcRoute(ctxV2, decimalStr('100'), 0.1, routes, pairs), ctxV2.sendParam(trader), "unwrap eth and three hops swap second")
            var a_ETH = await ctxV1.Web3.eth.getBalance(trader)
            var a_WETH = await ctxV1.WETH.methods.balanceOf(trader).call()
            var a_DODO = await ctxV1.DODO.methods.balanceOf(trader).call()
            console.log("After ETH:" + fromWei(a_ETH, 'ether') + "; WETH:" + fromWei(a_WETH, 'ether') + "; DODO:" + fromWei(a_DODO, 'ether'));
            console.log("===============================================")
            var c_ETH = await ctxV1.Web3.eth.getBalance(ctxV2.DODOProxyV2.options.address)
            var c_WETH = await ctxV1.WETH.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDT = await ctxV1.USDT.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_USDC = await ctxV1.USDC.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            var c_DODO = await ctxV1.DODO.methods.balanceOf(ctxV2.DODOProxyV2.options.address).call()
            console.log("Contract ETH:" + fromWei(c_ETH, 'ether') + "; WETH:" + fromWei(c_WETH, 'ether') + "; USDT:" + fromWei(c_USDT, 'mwei') + "; USDC:" + fromWei(c_USDC, 'mwei') + "; DODO:" + fromWei(c_DODO, "ether"));
            var w_eth = await ctxV1.Web3.eth.getBalance(ctxV1.WETH.options.address)
            console.log("weth contract After:" + fromWei(w_eth, 'ether'))
            assert(tx.events['OrderHistory'].returnValues['returnAmount'], "22004556829826281");
        });


    });
});
