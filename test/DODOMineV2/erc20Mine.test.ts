/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DODOMineV2Context, getDODOMineContext } from '../utils/DODOMineV2Context';
import { assert } from 'chai';
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

async function addRewardToken(ctx: DODOMineV2Context, token: Contract, start: number, end: number, rewardPerBlock: string) {
    await ctx.ERC20Mine.methods.addRewardToken(
        token.options.address,
        rewardPerBlock,
        start,
        end
    ).send(ctx.sendParam(projector));

    let idx = await ctx.ERC20Mine.methods.getIdByRewardToken(token.options.address).call();
    let rewardInfo = await ctx.ERC20Mine.methods.rewardTokenInfos(idx).call();
    await token.methods.transfer(rewardInfo.rewardVault, decimalStr("10000")).send(ctx.sendParam(projector));
}

async function stakeInfo(ctx: DODOMineV2Context, user: string, logInfo?: string) {
    console.log(logInfo)
    let totalSupply = await ctx.ERC20Mine.methods.totalSupply().call();
    let balance = await ctx.ERC20Mine.methods.balanceOf(user).call();
    console.log("totalSupply:" + fromWei(totalSupply, "ether") + " balance:" + fromWei(balance, "ether"));
}

async function getRewardInfo(ctx: DODOMineV2Context, idx: number, user: string, logInfo?: string) {
    let erc20Mine = ctx.ERC20Mine
    let obj = await erc20Mine.methods.rewardTokenInfos(idx).call();
    let curBlock = await ctx.Web3.eth.getBlockNumber();
    console.log(logInfo);
    // console.log("Static-Data: rewardToken:" + obj.rewardToken + " rewardVault:" + obj.rewardVault + " rewardPerBlock:" + fromWei(obj.rewardPerBlock, "ether"));
    console.log("Dynamic-Data: start:" + obj.startBlock + " end:" + obj.endBlock + " accRewardPerShare:" + fromWei(obj.accRewardPerShare, "ether") + " lastRewardBlock:" + obj.lastRewardBlock + " curBlock:" + curBlock);
    var pendingReward = null;
    if (user != null) {
        pendingReward = await erc20Mine.methods.getPendingReward(user, idx).call();
        console.log("User-pendingReward:" + fromWei(pendingReward, "ether"));
    }
    return [obj, pendingReward];
}

describe("erc20Mine", () => {
    let snapshotId: string;
    let ctx: DODOMineV2Context;

    before(async () => {
        ctx = await getDODOMineContext(null);
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
                decimalStr("0"),
                curBlock + 2,
                curBlock + 1000
            ).send(ctx.sendParam(projector));
            let [rewardTokenInfo,] = await getRewardInfo(ctx, 0, null, "");
            assert(rewardTokenInfo.rewardPerBlock, decimalStr("0"))
        });

        it("removeRewardToken", async () => {
            let erc20Mine = ctx.ERC20Mine;
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 10, curBlock + 110, decimalStr("0"));
            await addRewardToken(ctx, ctx.REWARD_2, curBlock + 10, curBlock + 110, decimalStr("0"));
            let [rewardTokenInfo,] = await getRewardInfo(ctx, 0, null, "");
            await erc20Mine.methods.removeRewardToken(
                rewardTokenInfo.rewardToken
            ).send(ctx.sendParam(projector));
            [rewardTokenInfo,] = await getRewardInfo(ctx, 0, null, "");
            assert(rewardTokenInfo.rewardToken, ctx.REWARD_2.options.address)
        });
        // ===========================

    })

    describe("erc20Mine", () => {

        it("deposit", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 102, decimalStr("10"));
            await stakeInfo(ctx, account0, "UserStakeInfo - Before");
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - Before");
            //增加区块
            await ctx.increBlock(3);

            // curBlock = await ctx.Web3.eth.getBlockNumber();
            // console.log("deposit curBlock:", curBlock)
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("5")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("5")
            ), ctx.sendParam(account0), "deposit");

            await stakeInfo(ctx, account0, "UserStakeInfo - After");
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After - 1");
            //增加区块
            await ctx.increBlock(3);

            let [obj, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After - 2");

            assert.equal(obj.accRewardPerShare, "2666666666666666666");
            assert.equal(pendingReward, "49999999999999999990");
        });


        it("withdraw", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 102, decimalStr("10"));
            // await stakeInfo(ctx, account0, "UserStakeInfo - Before");
            // await getRewardInfo(ctx, 0, account0, "UserRewardInfo - Before");
            //增加区块
            await ctx.increBlock(3);

            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("20")
            ), ctx.sendParam(account0), "deposit - account0");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account1), "deposit - account1");

            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After - 1");
            await ctx.increBlock(3);
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After - 2");

            await logGas(await ctx.ERC20Mine.methods.withdraw(
                decimalStr("10")
            ), ctx.sendParam(account0), "withdraw");
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After - 3");
            await logGas(await ctx.ERC20Mine.methods.withdraw(
                decimalStr("10")
            ), ctx.sendParam(account0), "withdraw");

            //增加区块
            await ctx.increBlock(3);
            let [obj, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After - 4");

            assert.equal(obj.accRewardPerShare, "2333333333333333333");
            assert.equal(pendingReward, "41666666666666666660");
        });


        it("getReward", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 102, decimalStr("10"));
            await stakeInfo(ctx, account0, "UserStakeInfo - Before");
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - Before");

            //增加区块
            await ctx.increBlock(3);

            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account1), "deposit");

            //增加区块
            await ctx.increBlock(3);

            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            await logGas(await ctx.ERC20Mine.methods.claimReward(0), ctx.sendParam(account0), "claimReward - 0");

            let rewardBalance = await ctx.REWARD_1.methods.balanceOf(account0).call();
            assert.equal(rewardBalance, "30000000000000000000");

        });

        it("getRewardAll", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 5, curBlock + 103, decimalStr("10"));
            await addRewardToken(ctx, ctx.REWARD_2, curBlock + 5, curBlock + 103, decimalStr("5"));
            await stakeInfo(ctx, account0, "UserStakeInfo - Before");
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - Before");

            //增加区块
            await ctx.increBlock(10);

            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account1), "deposit");

            //增加区块
            await ctx.increBlock(3);

            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            await logGas(await ctx.ERC20Mine.methods.claimAllRewards(), ctx.sendParam(account0), "claimReward - 0");

            let rewardBalance0 = await ctx.REWARD_1.methods.balanceOf(account0).call();
            let rewardBalance1 = await ctx.REWARD_2.methods.balanceOf(account0).call();
            assert.equal(rewardBalance0, "30000000000000000000");
            assert.equal(rewardBalance1, "15000000000000000000");
        });

        it("setReward - beforeStart", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 10, curBlock + 100, decimalStr("10"));
            await ctx.ERC20Mine.methods.setReward(0, decimalStr("5")).send(ctx.sendParam(projector));

            //增加区块
            await ctx.increBlock(10);

            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account1), "deposit");

            //增加区块
            await ctx.increBlock(3);

            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            await logGas(await ctx.ERC20Mine.methods.claimReward(0), ctx.sendParam(account0), "claimReward - 0");

            let rewardBalance = await ctx.REWARD_1.methods.balanceOf(account0).call();
            assert.equal(rewardBalance, "15000000000000000000");
        })

        it("setReward - ing", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 100, decimalStr("10"));

            //增加区块
            await ctx.increBlock(3);

            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account1), "deposit");

            //增加区块
            await ctx.increBlock(3);

            let [, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            assert.equal(pendingReward, "25000000000000000000");

            await ctx.ERC20Mine.methods.setReward(0, decimalStr("5")).send(ctx.sendParam(projector));

            //增加区块
            await ctx.increBlock(3);

            [, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            await logGas(await ctx.ERC20Mine.methods.claimReward(0), ctx.sendParam(account0), "claimReward - 0");

            let rewardBalance = await ctx.REWARD_1.methods.balanceOf(account0).call();
            assert.equal(rewardBalance, "40000000000000000000");
        })

        it("setReward - after", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 10, decimalStr("10"));

            //增加区块
            await ctx.increBlock(3);

            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account1), "deposit");

            //增加区块
            await ctx.increBlock(3);

            let [, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            assert.equal(pendingReward, "25000000000000000000");

            await ctx.ERC20Mine.methods.setReward(0, decimalStr("5")).send(ctx.sendParam(projector));

            //增加区块
            await ctx.increBlock(3);

            [, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            await logGas(await ctx.ERC20Mine.methods.claimReward(0), ctx.sendParam(account0), "claimReward - 0");

            let rewardBalance = await ctx.REWARD_1.methods.balanceOf(account0).call();
            assert.equal(rewardBalance, "25000000000000000000");
        })

        it("setEndBlock", async () => {
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 100, decimalStr("10"));

            //增加区块
            await ctx.increBlock(3);

            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");
            await logGas(await ctx.ERC20Mine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account1), "deposit");

            //增加区块
            await ctx.increBlock(3);

            await ctx.ERC20Mine.methods.setEndBlock(0, curBlock + 120).send(ctx.sendParam(projector));
            let [obj,] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            assert(obj.endBlock - curBlock - 100, "20");
        })

    })
});
