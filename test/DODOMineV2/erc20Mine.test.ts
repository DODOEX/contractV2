/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DODOMineV2Context, getDODOMineContext } from '../utils/DODOMineV2Context';
import { assert } from 'chai';
import BigNumber from 'bignumber.js';
import { Contract } from 'web3-eth-contract';

let account0: string;
let account1: string;
let projector: string;

async function init(ctx: DODOMineV2Context): Promise<void> {
    projector = ctx.Deployer;
    account0 = ctx.SpareAccounts[0];
    account1 = ctx.SpareAccounts[1];

    //For User
    await ctx.mintTestToken(account0, ctx.ERC20, decimalStr("1000"));
    await ctx.mintTestToken(account1, ctx.ERC20, decimalStr("500"));

    //For Project
    await ctx.mintTestToken(projector, ctx.REWARD_1, decimalStr("1000000"));
    await ctx.mintTestToken(projector, ctx.REWARD_2, decimalStr("1000000"));

    await ctx.approveProxy(account0, ctx.ERC20Mine.options.address, ctx.ERC20);
    await ctx.approveProxy(account1, ctx.ERC20Mine.options.address, ctx.ERC20);
}

async function addRewardToken(ctx: DODOMineV2Context, token: Contract, start: number, end: number) {
    await ctx.ERC20Mine.methods.addRewardToken(
        token.options.address,
        start,
        end
    ).send(ctx.sendParam(projector));

    let idx = await ctx.ERC20Mine.methods.getIdxByRewardToken(token.options.address).call();
    let rewardInfo = await ctx.ERC20Mine.methods.rewardTokenInfos(idx).call();
    await token.methods.transfer(rewardInfo.vault, decimalStr("10000")).send(this.sendParam(this.Deployer));
}

async function balanceInfo(ctx: DODOMineV2Context, idx:number,user: string,logInfo?:string) {

}

async function getRewardInfo(ctx: DODOMineV2Context, idx: number, user: string, logInfo?: string) {
    let erc20Mine = ctx.ERC20Mine
    let obj = await erc20Mine.methods.rewardTokenInfos(idx).call();
    console.log(logInfo);
    console.log("Static-Data: rewardToken:" + obj.rewardToken + " " + )
    console.log("startBlock:", obj.startBlock)
    console.log("endBlock:", obj.endBlock)
    console.log("rewardVault:", obj.rewardVault)
    console.log("rewardPerBlock:", obj.rewardPerBlock)
    console.log("accRewardPerShare:", obj.accRewardPerShare)
    console.log("lastRewardBlock:", obj.lastRewardBlock)
    var pendingReward = null;
    if (user != null) {
        pendingReward = await erc20Mine.methods.getPendingReward(idx, user).call();
        console.log("pendingReward:", pendingReward);
    }
    return [obj, pendingReward];
}

describe("erc20Mine", () => {
    let snapshotId: string;
    let ctx: DODOMineV2Context;

    before(async () => {
        ctx = await getDODOMineContext();
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });


    describe("baseMine", () => {
        // ======= Ownable =========
        it("addRewardToken", async () => {
            let erc20Mine = ctx.ERC20Mine;
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await erc20Mine.methods.addRewardToken(
                ctx.REWARD_1.options.address,
                curBlock + 2,
                curBlock + 1000
            ).send(ctx.sendParam(projector));
            let [rewardTokenInfo,] = await getRewardInfo(ctx, 0, null, "");
            assert(rewardTokenInfo.rewardPerBlock, decimalStr("0"))
        });

        it("removeRewardToken", async () => {
            let erc20Mine = ctx.ERC20Mine;
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 10, curBlock + 110);
            await addRewardToken(ctx, ctx.REWARD_2, curBlock + 10, curBlock + 110);
            let [rewardTokenInfo,] = await getRewardInfo(ctx, 0, null, "");
            await erc20Mine.methods.removeRewardToken(
                rewardTokenInfo.rewardToken
            ).send(ctx.sendParam(projector));
            [rewardTokenInfo,] = await getRewardInfo(ctx, 0, null, "");
            assert(rewardTokenInfo.rewardToken, ctx.REWARD_2.options.address)
        });

        it("setReward", async () => {

        });

        it("setEndBlock", async () => {

        });

        // ===========================

    })

    describe("erc20Mine", () => {

        it("deposit", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 102);
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");

            //增加区块
            await ctx.mintTestToken(account0, ctx.ERC20, decimalStr("0"));
            await ctx.mintTestToken(account0, ctx.ERC20, decimalStr("0"));
            await ctx.mintTestToken(account0, ctx.ERC20, decimalStr("0"));



        });


        it("withdraw", async () => {

        });

        it("withdrawAll", async () => {

        });


        it("getReward", async () => {

        });

        it("getRewardAll", async () => {

        });

        it("exit", async () => {

        });
    })
});
