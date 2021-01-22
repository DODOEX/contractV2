/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, mweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { ProxyContext, getProxyContext } from '../utils/ProxyContextV2';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';

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

async function initIncentive(ctx: ProxyContext): Promise<void> {
    await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
    await ctx.mintTestToken(ctx.DODOIncentive.options.address, ctx.DODO, decimalStr("1000000"));
}


describe("DODOProxyV2.0", () => {
    let snapshotId: string;
    let ctx: ProxyContext;
    let dpp_DODO_USDT: string;
    let dvm_WETH_USDT: string;

    before(async () => {
        let ETH = await contracts.newContract(
            contracts.WETH_CONTRACT_NAME
        );
        ctx = await getProxyContext(ETH.options.address);
        await init(ctx);
        dpp_DODO_USDT = await initCreateDPP(ctx, ctx.DODO.options.address, ctx.USDT.options.address, decimalStr("100000"), mweiStr("20000"), "0", mweiStr("0.2"));
        dvm_WETH_USDT = await initCreateDVM(ctx, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', ctx.USDT.options.address, decimalStr("5"), mweiStr("3000"), "5", mweiStr("600"));
        console.log("dpp_DODO_USDT:", dpp_DODO_USDT);
        console.log("dvm_WETH_USDT:", dvm_WETH_USDT);
        await initIncentive(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODOIncentive", () => {

        it("incentive-switch with trade", async () => {
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            var totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("Init -  Total Reward:" + totalReward + "; Total distribution:" + totalDistribution);

            //Aim to increase block
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.DODOIncentive.methods.changePerReward(0).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("Close incentive -  Total Reward:" + totalReward + "; Total distribution:" + totalDistribution);

            //Aim to increase block
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));

            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            //Aim to increase block
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("End incentive - Total Reward:" + totalReward + "; Total distribution:" + totalDistribution);
            assert(totalReward, decimalStr("100"));
        });

        it("incentive-changeBoost with trade", async () => {
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            var totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("Init -  Total Reward:" + totalReward + "; Total distribution:" + totalDistribution);

            //Aim to increase block
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));

            await ctx.DODOIncentive.methods.changePerReward(decimalStr("20")).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("change incentive -  Total Reward:" + totalReward + "; Total distribution:" + totalDistribution);

            //Aim to increase block
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(lp, ctx.DODO, decimalStr("1000"));
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("End incentive - Total Reward:" + totalReward + "; Total distribution:" + totalDistribution);

            assert(totalReward, decimalStr("140"));
        });

        it("tigger - incentive", async () => {
            await ctx.mintTestToken(trader, ctx.DODO, decimalStr("2000"));
            var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
            var b_USDT = await ctx.USDT.methods.balanceOf(trader).call()
            console.log("Before DODO:" + b_DODO + "; USDT:" + b_USDT);

            var b_totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var b_totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("Before Total Reward:" + b_totalReward + "; Total distribution:" + b_totalDistribution)

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
            ), ctx.sendParam(trader), "swap without incentive first");
            
            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("500"),
                1,
                dodoPairs,
                directions,
                false,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap without incentive second");

            var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
            var a_USDT = await ctx.USDT.methods.balanceOf(trader).call()
            console.log("After No Incentive DODO:" + a_DODO + "; USDT:" + a_USDT);

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("500"),
                1,
                dodoPairs,
                directions,
                true,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap with incentive first");

            await logGas(await ctx.DODOProxyV2.methods.dodoSwapV2TokenToToken(
                ctx.DODO.options.address,
                ctx.USDT.options.address,
                decimalStr("500"),
                1,
                dodoPairs,
                directions,
                true,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap with incentive second");

            var a_totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var a_totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("After Total Reward:" + a_totalReward + "; Total distribution:" + a_totalDistribution)

            a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
            a_USDT = await ctx.USDT.methods.balanceOf(trader).call()
            console.log("After Incentive DODO:" + a_DODO + "; USDT:" + a_USDT);
            assert(a_DODO, "1095000000000000000");
        });
    });
});
