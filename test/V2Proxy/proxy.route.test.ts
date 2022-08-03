/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, mweiStr,fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import Web3 from 'web3';
import { ProxyContext, getProxyContext } from '../utils/ProxyContextV2';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';
import { createIndexedAccessTypeNode } from 'typescript';
import { getDefaultWeb3 } from '../utils/EVM';
import BigNumber from 'bignumber.js';

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

describe("DODORouteProxy", () => {
    let snapshotId: string;
    let ctx: ProxyContext;
    let dvm_DODO_USDT: string;
    let dvm_WETH_USDT: string;
    let DODOV2Adapter: Contract;
    let MockExternalSwap: Contract;
    let web3:Web3;
    let ETH_ADDRESS:string;

    before(async () => {
        ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        web3 = getDefaultWeb3();
        let ETH = await contracts.newContract(
            contracts.WETH_CONTRACT_NAME
        );
        ctx = await getProxyContext(ETH.options.address);
        await init(ctx);
        //console.log("all acount:", ctx.SpareAccounts, ctx.Deployer)
        dvm_DODO_USDT = await initCreateDVM(ctx, ctx.DODO.options.address, ctx.USDT.options.address, decimalStr("100000"), mweiStr("20000"), "0", mweiStr("0.2"));
        dvm_WETH_USDT = await initCreateDVM(ctx, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', ctx.USDT.options.address, decimalStr("5"), mweiStr("3000"), "5", mweiStr("600"));
        console.log("dvm_DODO_USDT:", dvm_DODO_USDT);
        console.log("dvm_WETH_USDT:", dvm_WETH_USDT);
        // for adapter
        DODOV2Adapter = await contracts.newContract(
            contracts.DODO_ADAPTER,
        );
        console.log("dodo v2 adapter:", DODOV2Adapter.options.address);
        // deploy external swap
        MockExternalSwap = await contracts.newContract(
            contracts.EXTERNAL_MOCK,
        );
        console.log("mock external swap:", MockExternalSwap.options.address);
        await MockExternalSwap.methods.setPrice(1).send(ctx.sendParam(ctx.Deployer))
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODORouteProxy", () => {
        /*
            function mixSwap(
                address fromToken,
                address toToken,
                uint256 fromTokenAmount,
                uint256 minReturnAmount,
                address[] memory mixAdapters,
                address[] memory mixPairs,
                address[] memory assetTo,
                uint256 directions,
                bytes[] memory moreInfos,
                bytes memory feeData,
                uint256 deadLine
            ) external payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        */
        it("mixSwap-two tokens", async() => {
            await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(trader, ctx.USDT, decimalStr("100"));

            var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
            var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
            var fee_DODO = await ctx.DODO.methods.balanceOf(ctx.Deployer).call() // dodo fee
            var lp_DODO = await ctx.DODO.methods.balanceOf(lp).call() // rebate fee

            var dodoPairs = [
                dvm_DODO_USDT,
                dvm_WETH_USDT
            ]
            var assetTo = [
                dvm_DODO_USDT,
                dvm_WETH_USDT,
                trader
            ]
            var adapters = [
                DODOV2Adapter.options.address,
                DODOV2Adapter.options.address
            ]
            var feeData = web3.eth.abi.encodeParameters(["address", "uint8"],[lp, 30])
            var directions = 2
            await logGas(await ctx.DODORouteProxy.methods.mixSwap(
                ctx.DODO.options.address,
                ctx.WETH.options.address,
                decimalStr("500"),
                1,
                adapters,
                dodoPairs,
                assetTo,
                directions,
                ["0x0","0x0"],
                feeData,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap - two jump");

            var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
            var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();

            var fee_DODO_after = await ctx.DODO.methods.balanceOf(ctx.Deployer).call() // dodo fee
            var lp_DODO_after = await ctx.DODO.methods.balanceOf(lp).call() // rebate fee

            console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
            console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
            console.log("fee amount:", fee_DODO_after, fee_DODO, lp_DODO_after, lp_DODO)
            assert.equal(a_DOOD, decimalStr("500"));
            
        })

        it("mixSwap-out ETH", async() => {
            await ctx.mintTestToken(trader, ctx.DODO, decimalStr("1000"));
            await ctx.mintTestToken(trader, ctx.USDT, decimalStr("100"));

            var b_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
            var b_WETH = await ctx.WETH.methods.balanceOf(trader).call();
            var b_ETH = await ctx.Web3.eth.getBalance(trader);
            var fee_DODO = await ctx.DODO.methods.balanceOf(ctx.Deployer).call() // dodo fee
            var lp_DODO = await ctx.DODO.methods.balanceOf(lp).call() // rebate fee

            var dodoPairs = [
                dvm_DODO_USDT,
                dvm_WETH_USDT
            ]
            var assetTo = [
                dvm_DODO_USDT,
                dvm_WETH_USDT,
                ctx.DODORouteProxy.options.address
            ]
            var adapters = [
                DODOV2Adapter.options.address,
                DODOV2Adapter.options.address
            ]
            var feeData = web3.eth.abi.encodeParameters(["address", "uint8"],[lp, 30])
            var directions = 2
            console.log("weth address:", ctx.WETH.options.address)
            console.log("route proxy weth address:", await ctx.DODORouteProxy.methods._WETH_().call())
            console.log("dvm weth balance:", await ctx.WETH.methods.balanceOf(dvm_WETH_USDT).call() , await ctx.Web3.eth.getBalance(dvm_WETH_USDT))
            await logGas(await ctx.DODORouteProxy.methods.mixSwap(
                ctx.DODO.options.address,
                ETH_ADDRESS,
                decimalStr("500"),
                0,
                adapters,
                dodoPairs,
                assetTo,
                directions,
                ["0x0","0x0"],
                feeData,
                Math.floor(new Date().getTime() / 1000 + 60 * 10)
            ), ctx.sendParam(trader), "swap - two jump");

            var a_DOOD = await ctx.DODO.methods.balanceOf(trader).call();
            var a_WETH = await ctx.WETH.methods.balanceOf(trader).call();
            var a_ETH = await ctx.Web3.eth.getBalance(trader);

            var fee_DODO_after = await ctx.DODO.methods.balanceOf(ctx.Deployer).call() // dodo fee
            var lp_DODO_after = await ctx.DODO.methods.balanceOf(lp).call() // rebate fee

            console.log("b_DOOD:" + b_DOOD + " a_DODO:" + a_DOOD);
            console.log("b_WETH:" + b_WETH + " a_WETH:" + a_WETH);
            console.log("b_ETH:" + b_ETH + " a_ETH:" + a_ETH);
            console.log("fee amount:", fee_DODO_after, fee_DODO, lp_DODO_after, lp_DODO)
            assert.equal(a_DOOD, decimalStr("500"));
        })


    });
});