/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { assert } from 'chai';
import { DODOContext, getDODOContext } from '../utils-v1/Context-route';
import { ProxyContext, getProxyContext } from '../utils/ProxyContext';
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
            await ctxV1.DODO.methods.approve(ctxV2.SmartApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader));
            await ctxV1.USDT.methods.approve(ctxV2.SmartApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader));
            var tx = await logGas(await ctxV2.DODOProxy.methods.addLiquidityToV1(
                trader,
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
            await ctxV1.USDC.methods.approve(ctxV2.SmartApprove.options.address, MAX_UINT256).send(ctxV2.sendParam(trader));
            var tx = await logGas(await ctxV2.DODOProxy.methods.addLiquidityToV1(
                trader,
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
    });
});
