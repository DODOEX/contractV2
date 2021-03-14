/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, MAX_UINT256, mweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { ProxyContext, getProxyContext } from '../utils/ProxyContextV2';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';

let deployer: string;
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
    deployer = ctx.Deployer;
    lp = ctx.SpareAccounts[0];
    project = ctx.SpareAccounts[1];
    trader = ctx.SpareAccounts[2];

    await ctx.mintTestToken(deployer, ctx.DODO, decimalStr("1000000"));
    await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000000"));
    await ctx.mintTestToken(project, ctx.DODO, decimalStr("1000000"));

    await ctx.mintTestToken(lp, ctx.USDT, mweiStr("1000000"));
    await ctx.mintTestToken(project, ctx.USDT, mweiStr("1000000"));

    await ctx.DODO.methods.approve(ctx.LockedVault02.options.address, MAX_UINT256).send(ctx.sendParam(deployer));
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

async function initIncentive(ctx: ProxyContext, delay: number): Promise<void> {
    await ctx.LockedVault02.methods.deposit(decimalStr("1000000")).send(ctx.sendParam(ctx.Deployer));
    await ctx.LockedVault02.methods.updateParams(
        Math.floor(new Date().getTime() / 1000 + delay),
        60 * 60 * 24 * 30,
        "300000000000000000"
    ).send(ctx.sendParam(ctx.Deployer));
}

async function getUserInfo(ctx: ProxyContext, user: string, logInfo?: string) {
    var DODO = await ctx.DODO.methods.balanceOf(trader).call()
    var USDT = await ctx.USDT.methods.balanceOf(trader).call()
    console.log("DODO balance:" + DODO + "; USDT balance:" + USDT + "==" + logInfo);
    var originBalance = await ctx.LockedVault02.methods.getOriginBalance(user).call();
    var claimedBalance = await ctx.LockedVault02.methods.getClaimedBalance(user).call();
    console.log("originBalance:" + originBalance + "; ClaimedBalance:" + claimedBalance + "==" + logInfo);
    var res = {
        "dodoBalance": DODO,
        "usdtBalance": USDT,
        "originBalance": originBalance,
        "claimedBalance": claimedBalance
    }
    return res
}


describe("DODOProxyV2-Incentive-BSC", () => {
    let snapshotId: string;
    let ctx: ProxyContext;
    let dpp_DODO_USDT: string;
    // let dvm_WETH_USDT: string;

    before(async () => {
        let ETH = await contracts.newContract(
            contracts.WETH_CONTRACT_NAME
        );
        ctx = await getProxyContext(ETH.options.address);
        await init(ctx);
        dpp_DODO_USDT = await initCreateDPP(ctx, ctx.DODO.options.address, ctx.USDT.options.address, decimalStr("5000"), mweiStr("20000"), "0", mweiStr("4"));
        console.log("dpp_DODO_USDT:", dpp_DODO_USDT);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODOIncentiveBsc", () => {

        it("tigger - incentive - notstart", async () => {
            await initIncentive(ctx, 60 * 10);

            await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
            await getUserInfo(ctx, trader, "Before Trade");

            var dodoPairs = [
                dpp_DODO_USDT
            ]
            var directions = 0

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("200"),
                1,
                dodoPairs,
                directions,
                true,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap with incentive first");

            await getUserInfo(ctx, trader, "Trade One");

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("200"),
                1,
                dodoPairs,
                directions,
                true,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap with incentive second");

            await getUserInfo(ctx, trader, "Trade Twice");

            await logGas(await ctx.LockedVault02.methods.claim(), ctx.sendParam(trader), "exec claim");

            await getUserInfo(ctx, trader, "After claim");

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("200"),
                1,
                dodoPairs,
                directions,
                false,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap without incentive");

            await getUserInfo(ctx, trader, "Trade Without Incentive");
            // assert(a_DODO, "1095000000000000000");
        });


        it("tigger - incentive - start", async () => {
            await initIncentive(ctx, -1);
            //Incentive前LockedVault的两个值状态
            //Incentive执行-两笔
            //Incentive后LockedVault的状态
            //执行claim
            //LockedVault状态
            //Incentive关闭
            //LockedVault状态
            await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
            await getUserInfo(ctx, trader, "Before Trade");

            var dodoPairs = [
                dpp_DODO_USDT
            ]
            var directions = 0

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("200"),
                1,
                dodoPairs,
                directions,
                true,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap with incentive first");

            await getUserInfo(ctx, trader, "Trade One");

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("200"),
                1,
                dodoPairs,
                directions,
                true,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap with incentive second");

            await getUserInfo(ctx, trader, "Trade Twice");

            await logGas(await ctx.LockedVault02.methods.claim(), ctx.sendParam(trader), "exec claim");

            await getUserInfo(ctx, trader, "After claim");

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("200"),
                1,
                dodoPairs,
                directions,
                false,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap without incentive");

            await getUserInfo(ctx, trader, "Trade Without Incentive");
        });
    });
});
