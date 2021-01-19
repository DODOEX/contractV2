/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import { decimalStr, mweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { ProxyContext, getProxyContext } from '../utils/ProxyContextV2';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';

let project: string;
let buyer1: string;
let buyer2: string;


async function init(ctx: ProxyContext): Promise<void> {
    project = ctx.SpareAccounts[1];
    buyer1 = ctx.SpareAccounts[2];
    buyer2 = ctx.SpareAccounts[3];

    await ctx.mintTestToken(project, ctx.DODO, decimalStr("1000000"));

    await ctx.mintTestToken(buyer1, ctx.USDT, mweiStr("10000"));
    await ctx.mintTestToken(buyer2, ctx.USDT, mweiStr("10000"));

    await ctx.approveProxy(project);
    await ctx.approveProxy(buyer1);
    await ctx.approveProxy(buyer2);
}

async function initCreateCP(ctx: ProxyContext, token0: string, token1: string, token0Amount: string, timeLine: number[], valueList: string[]): Promise<string> {
    await ctx.DODOProxyV2.methods.createCrowdPooling(
        token0,
        token1,
        token0Amount,
        timeLine,
        valueList,
        false,
        Math.floor(new Date().getTime() / 1000 + 60 * 10)
    ).send(ctx.sendParam(project, "0.2"));
    if (token0 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token0 = ctx.WETH.options.address;
    if (token1 == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') token1 = ctx.WETH.options.address;
    var addr = await ctx.CPFactory.methods._REGISTRY_(token0, token1, 0).call();
    return addr;
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


describe("DODOProxyV2.0", () => {
    let snapshotId: string;
    let ctx: ProxyContext;
    let cp_DODO_USDT: string;
    let cp_DODO_WETH: string;
    let CP_DODO_USDT: Contract;
    let CP_DODO_WETH: Contract;

    before(async () => {
        let ETH = await contracts.newContract(
            contracts.WETH_CONTRACT_NAME
        );
        ctx = await getProxyContext(ETH.options.address);
        await init(ctx);
        var timeLine = [
            Math.floor(new Date().getTime() / 1000) + 10,
            60 * 60 * 24,
            0,
            60 * 60 * 24 * 30,
            0
        ]
        var valueList = [
            mweiStr("10000"),
            decimalStr("0"),
            mweiStr("10"),
            decimalStr("1")
        ]
        cp_DODO_USDT = await initCreateCP(ctx, ctx.DODO.options.address, ctx.USDT.options.address, decimalStr("100000"), timeLine, valueList);
        CP_DODO_USDT = contracts.getContractWithAddress(contracts.CROWD_POOLING_NAME, cp_DODO_USDT);
        console.log("cp_DODO_USDT:", cp_DODO_USDT);
        cp_DODO_WETH = await initCreateCP(ctx, ctx.DODO.options.address, ctx.WETH.options.address, decimalStr("100000"), timeLine, valueList);
        CP_DODO_WETH = contracts.getContractWithAddress(contracts.CROWD_POOLING_NAME, cp_DODO_WETH);
        console.log("cp_DODO_WETH:", cp_DODO_WETH);
        console.log("Wait to bid start...");
        await delay(11000);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODOProxy", () => {
        it("createCP", async () => {
            var baseToken = ctx.DODO.options.address;
            var quoteToken = ctx.USDT.options.address;
            var baseAmount = decimalStr("1");
            var timeLine = [
                Math.floor(new Date().getTime() / 1000) + 10,
                60 * 60 * 24,
                0,
                60 * 60 * 24 * 30,
                0
            ]
            var valueList = [
                mweiStr("5"),
                decimalStr("0"),
                mweiStr("10"),
                decimalStr("1")
            ]
            await logGas(await ctx.DODOProxyV2.methods.createCrowdPooling(
                baseToken,
                quoteToken,
                baseAmount,
                timeLine,
                valueList,
                false,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(project, "0.2"), "createCP");
            var addrs = await ctx.CPFactory.methods.getCrowdPooling(baseToken, quoteToken).call();
            assert.equal(
                await ctx.DODO.methods.balanceOf(addrs[1]).call(),
                baseAmount
            );
        });

        it("bid", async () => {
            var b_base = await ctx.DODO.methods.balanceOf(cp_DODO_USDT).call();
            var b_quote = await ctx.USDT.methods.balanceOf(cp_DODO_USDT).call();
            var b_lp_1 = await CP_DODO_USDT.methods.getShares(buyer1).call();
            var b_lp_2 = await CP_DODO_USDT.methods.getShares(buyer2).call();
            assert.equal(b_base, decimalStr("100000"));
            assert.equal(b_quote, mweiStr("0"));
            assert.equal(b_lp_1, decimalStr("0"));
            assert.equal(b_lp_2, decimalStr("0"));

            await logGas(await ctx.DODOProxyV2.methods.bid(
                cp_DODO_USDT,
                mweiStr("50"),
                0,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(buyer1), "bid");

            await logGas(await ctx.DODOProxyV2.methods.bid(
                cp_DODO_USDT,
                mweiStr("80"),
                0,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(buyer2), "bid");

            await logGas(await ctx.DODOProxyV2.methods.bid(
                cp_DODO_USDT,
                mweiStr("80"),
                0,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(buyer2), "bid");

            await logGas(await ctx.DODOProxyV2.methods.bid(
                cp_DODO_USDT,
                mweiStr("80"),
                0,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(buyer2), "bid");

            var a_base = await ctx.DODO.methods.balanceOf(cp_DODO_USDT).call();
            var a_quote = await ctx.USDT.methods.balanceOf(cp_DODO_USDT).call();
            var a_lp_1 = await CP_DODO_USDT.methods.getShares(buyer1).call();
            var a_lp_2 = await CP_DODO_USDT.methods.getShares(buyer2).call();
            assert.equal(a_base, decimalStr("100000"));
            assert.equal(a_quote, mweiStr("290"));
            assert.equal(a_lp_1, mweiStr("50"));
            assert.equal(a_lp_2, mweiStr("240"));
        });


        it("bid - ETH", async () => {
            var b_base = await ctx.DODO.methods.balanceOf(cp_DODO_WETH).call();
            var b_quote = await ctx.WETH.methods.balanceOf(cp_DODO_WETH).call();
            var b_lp_1 = await CP_DODO_WETH.methods.getShares(buyer1).call();
            var b_lp_2 = await CP_DODO_WETH.methods.getShares(buyer2).call();
            assert.equal(b_base, decimalStr("100000"));
            assert.equal(b_quote, decimalStr("0"));
            assert.equal(b_lp_1, decimalStr("0"));
            assert.equal(b_lp_2, decimalStr("0"));

            await logGas(await ctx.DODOProxyV2.methods.bid(
                cp_DODO_WETH,
                decimalStr("2"),
                1,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(buyer1, "2"), "bid");

            await logGas(await ctx.DODOProxyV2.methods.bid(
                cp_DODO_WETH,
                decimalStr("1"),
                1,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(buyer2, "1"), "bid");

            var a_base = await ctx.DODO.methods.balanceOf(cp_DODO_WETH).call();
            var a_quote = await ctx.WETH.methods.balanceOf(cp_DODO_WETH).call();
            var a_lp_1 = await CP_DODO_WETH.methods.getShares(buyer1).call();
            var a_lp_2 = await CP_DODO_WETH.methods.getShares(buyer2).call();
            assert.equal(a_base, decimalStr("100000"));
            assert.equal(a_quote, decimalStr("3"));
            assert.equal(a_lp_1, decimalStr("2"));
            assert.equal(a_lp_2, decimalStr("1"));
        });

    });
});
