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

async function initIncentive(ctx: DODOContext): Promise<void> {
    var blockNum = await ctx.Web3.eth.getBlockNumber();
    await ctx.DODOIncentive.methods.switchIncentive(blockNum + 1).send(ctx.sendParam(ctx.Deployer));
    await ctx.mintToken(ctx.DODO, null, ctx.DODOIncentive.options.address, decimalStr("10000"), mweiStr("0"));
}

//mock sdk logic
async function calcRoute(ctx: DODOContext, fromTokenAmount: string, slippage: number, routes: any[], pairs: any[], isIncentive: boolean) {
    let tmpDirections: number[] = []
    let strDirections: string = ''
    let dodoPairs: string[] = []

    for (let i = 0; i < pairs.length; i++) {
        let curPair = pairs[i]
        dodoPairs.push(curPair.pair)
        if (routes[i].address == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
            tmpDirections[i] = 0;
        } else if (curPair.base === routes[i].address) {
            tmpDirections[i] = 0;
        } else {
            tmpDirections[i] = 1;
        }
    }

    var [returmAmount,] = await ctx.DODOSwapCalcHelper.methods.calcReturnAmountV1(
        fromTokenAmount,
        dodoPairs,
        tmpDirections,
    ).call();
    // console.log("returnAmount:", returmAmount)
    // console.log("localAmount:", swapAmount)
    // console.log("midPrices:", midPrices)


    let toAmount = new BigNumber(returmAmount).multipliedBy(1 - slippage).toFixed(0, BigNumber.ROUND_DOWN)
    let deadline = Math.floor(new Date().getTime() / 1000 + 60 * 10);

    for (let i = tmpDirections.length - 1; i >= 0; i--) {
        strDirections += tmpDirections[i].toString()
    }

    return ctx.DODOV1Proxy02.methods.dodoSwapV1(
        routes[0].address,
        routes[routes.length - 1].address,
        fromTokenAmount,
        toAmount,
        dodoPairs,
        parseInt(strDirections, 2),
        isIncentive,
        deadline
    )
}

describe("Trader", () => {
    let snapshotId: string;
    let ctx: DODOContext;

    before(async () => {
        let ETH = await contracts.newContract(
            contracts.WETH_CONTRACT_NAME
        );
        ctx = await getDODOContext(ETH.options.address);
        await initDODO_USDT(ctx);
        await initUSDT_USDC(ctx);
        await initWETH_USDC(ctx);
        await initIncentive(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("route calc with incentive test", () => {
        it("incentive-switch with trade", async () => {
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            var totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            var blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("Init -  Total Reward:" + fromWei(totalReward, 'ether') + "; Total distribution:" + fromWei(totalDistribution, 'ether') + "; BlockNumber:" + blockNum);

            //Aim to increase block
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("Close BlockNumber:", blockNum + 1)
            await ctx.DODOIncentive.methods.switchIncentive(0).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("Close incentive -  Total Reward:" + fromWei(totalReward, 'ether') + "; Total distribution:" + fromWei(totalDistribution, 'ether') + "; BlockNumber:" + blockNum)
            //Aim to increase block
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));

            blockNum = await ctx.Web3.eth.getBlockNumber();
            await ctx.DODOIncentive.methods.switchIncentive(blockNum + 1).send(ctx.sendParam(ctx.Deployer));
            console.log("Open BlockNumber:", blockNum + 1)
            //Aim to increase block
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("End incentive - Total Reward:" + fromWei(totalReward, 'ether') + "; Total distribution:" + fromWei(totalDistribution, 'ether') + "; BlockNumber:" + blockNum)
            assert(totalReward, decimalStr("100"));
        });

        it("incentive-changeBoost with trade", async () => {
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            var totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            var blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("Init -  Total Reward:" + fromWei(totalReward, 'ether') + "; Total distribution:" + fromWei(totalDistribution, 'ether') + "; BlockNumber:" + blockNum);

            //Aim to increase block
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));

            blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("Change BlockNumber:", blockNum + 1)
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("20")).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("change incentive -  Total Reward:" + fromWei(totalReward, 'ether') + "; Total distribution:" + fromWei(totalDistribution, 'ether') + "; BlockNumber:" + blockNum)

            //Aim to increase block
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.mintToken(ctx.DODO, null, lp, decimalStr("100"), mweiStr("0"));
            await ctx.DODOIncentive.methods.changePerReward(decimalStr("10")).send(ctx.sendParam(ctx.Deployer));
            totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            blockNum = await ctx.Web3.eth.getBlockNumber();
            console.log("End incentive - Total Reward:" + fromWei(totalReward, 'ether') + "; Total distribution:" + fromWei(totalDistribution, 'ether') + "; BlockNumber:" + blockNum)
            assert(totalReward, decimalStr("140"));
        });

        it("directly swap with incentive", async () => {
            await ctx.mintToken(ctx.DODO, ctx.USDT, trader, decimalStr("1000"), mweiStr("0"));
            var b_DODO = await ctx.DODO.methods.balanceOf(trader).call()
            var b_USDT = await ctx.USDT.methods.balanceOf(trader).call()
            console.log("Before DODO:" + fromWei(b_DODO, 'ether') + "; USDT:" + fromWei(b_USDT, 'mwei'));

            var b_totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var b_totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("Before Total Reward:" + fromWei(b_totalReward, 'ether') + "; Total distribution:" + fromWei(b_totalDistribution, 'ether'))

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
            await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs, false), ctx.sendParam(trader), "directly swap without incentive first")
            await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs, false), ctx.sendParam(trader), "directly swap without incentive second")
            var a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
            var a_USDT = await ctx.USDT.methods.balanceOf(trader).call()
            console.log("After No Incentive DODO:" + fromWei(a_DODO, 'ether') + "; USDT:" + fromWei(a_USDT, 'mwei'));

            await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs, true), ctx.sendParam(trader), "directly swap with incentive first")
            await logGas(await calcRoute(ctx, decimalStr('10'), 0.1, routes, pairs, true), ctx.sendParam(trader), "directly swap with incentive second")

            var a_totalReward = await ctx.DODOIncentive.methods.totalReward().call();
            var a_totalDistribution = await ctx.DODOIncentive.methods.totalDistribution().call();
            console.log("After Total Reward:" + fromWei(a_totalReward, 'ether') + "; Total distribution:" + fromWei(a_totalDistribution, 'ether'))

            a_DODO = await ctx.DODO.methods.balanceOf(trader).call()
            a_USDT = await ctx.USDT.methods.balanceOf(trader).call()
            console.log("After Incentive DODO:" + fromWei(a_DODO, 'ether') + "; USDT:" + fromWei(a_USDT, 'mwei'));
            assert(a_DODO, decimalStr("961.493"));
        });
    });
});
