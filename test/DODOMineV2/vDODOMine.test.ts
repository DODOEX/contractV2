/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DODOMineV2Context, getDODOMineContext } from '../utils/DODOMineV2Context';
import { VDODOContext, getVDODOContext } from '../utils/VDODOContext';
import { assert } from 'chai';
import { Contract } from 'web3-eth-contract';
const truffleAssert = require('truffle-assertions');

let account0: string;
let account1: string;
let projector: string;
let dodoTeam: string;

async function init(ctx: DODOMineV2Context): Promise<void> {
    projector = ctx.Deployer;
    account0 = ctx.SpareAccounts[0];
    account1 = ctx.SpareAccounts[1];

    //For Project
    await ctx.mintTestToken(projector, ctx.REWARD_1, decimalStr("1000000"));
    await ctx.mintTestToken(projector, ctx.REWARD_2, decimalStr("1000000"));

    await ctx.approveProxy(account0, ctx.VDODOMine.options.address, ctx.ERC20);
    await ctx.approveProxy(account1, ctx.VDODOMine.options.address, ctx.ERC20);
}

async function initVdodo(ctx: VDODOContext): Promise<void> {
    dodoTeam = ctx.Deployer;
    await ctx.mintTestToken(account0, decimalStr("10000"));
    await ctx.mintTestToken(account1, decimalStr("10000"));

    await ctx.approveProxy(account0);
    await ctx.approveProxy(account1);
}

async function mint(ctx: VDODOContext, user: string, mintAmount: string, superior: string) {
    await ctx.VDODO.methods.mint(
        mintAmount,
        superior
    ).send(ctx.sendParam(user));
}

async function addRewardToken(ctx: DODOMineV2Context, token: Contract, start: number, end: number, rewardPerBlock: string) {
    await ctx.VDODOMine.methods.addRewardToken(
        token.options.address,
        rewardPerBlock,
        start,
        end
    ).send(ctx.sendParam(projector));

    let idx = await ctx.VDODOMine.methods.getIdByRewardToken(token.options.address).call();
    let rewardInfo = await ctx.VDODOMine.methods.rewardTokenInfos(idx).call();
    await token.methods.transfer(rewardInfo.rewardVault, decimalStr("10000")).send(ctx.sendParam(projector));
}

async function stakeInfo(ctx: DODOMineV2Context, user: string, logInfo?: string) {
    console.log(logInfo)
    let totalSupply = await ctx.VDODOMine.methods.totalSupply().call();
    let balance = await ctx.VDODOMine.methods.balanceOf(user).call();
    console.log("totalSupply:" + fromWei(totalSupply, "ether") + " balance:" + fromWei(balance, "ether"));
}

async function vdodoBalance(ctx: VDODOContext, user: string, logInfo?: string) {
    console.log(logInfo)
    let dodoBalance = await ctx.VDODO.methods.dodoBalanceOf(user).call();
    let availableBalance = await ctx.VDODO.methods.availableBalanceOf(user).call();
    console.log("dodoBalance:" + fromWei(dodoBalance, "ether") + " availableBalance:" + fromWei(availableBalance, "ether"));
    return [dodoBalance, availableBalance]
}

async function getRewardInfo(ctx: DODOMineV2Context, idx: number, user: string, logInfo?: string) {
    let VDODOMine = ctx.VDODOMine
    let obj = await VDODOMine.methods.rewardTokenInfos(idx).call();
    let curBlock = await ctx.Web3.eth.getBlockNumber();
    console.log(logInfo);
    // console.log("Static-Data: rewardToken:" + obj.rewardToken + " rewardVault:" + obj.rewardVault + " rewardPerBlock:" + fromWei(obj.rewardPerBlock, "ether"));
    console.log("Dynamic-Data: start:" + obj.startBlock + " end:" + obj.endBlock + " accRewardPerShare:" + fromWei(obj.accRewardPerShare, "ether") + " lastRewardBlock:" + obj.lastRewardBlock + " curBlock:" + curBlock);
    var pendingReward = null;
    if (user != null) {
        pendingReward = await VDODOMine.methods.getPendingReward(user, idx).call();
        console.log("User-pendingReward:" + fromWei(pendingReward, "ether"));
    }
    return [obj, pendingReward];
}

describe("VDODOMine", () => {
    let snapshotId: string;
    let ctx: DODOMineV2Context;
    let ctxVdodo: VDODOContext;

    before(async () => {
        ctxVdodo = await getVDODOContext();
        ctx = await getDODOMineContext(ctxVdodo.VDODO.options.address);
        await init(ctx);
        await initVdodo(ctxVdodo);
        await ctxVdodo.VDODO.methods.updateGovernance(ctx.VDODOMine.options.address).send(ctxVdodo.sendParam(ctxVdodo.Deployer));
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("VDODOMine", () => {

        it("deposit", async () => {
            await mint(ctxVdodo, account0, decimalStr("10000"), dodoTeam);
            await vdodoBalance(ctxVdodo, account0, "vDODOBalance - before");

            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 102, decimalStr("10"));
            await stakeInfo(ctx, account0, "UserStakeInfo - Before");
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - Before");

            //增加区块
            await ctx.increBlock(3);

            await logGas(await ctx.VDODOMine.methods.deposit(
                decimalStr("5")
            ), ctx.sendParam(account0), "deposit - 0");

            await logGas(await ctx.VDODOMine.methods.deposit(
                decimalStr("5")
            ), ctx.sendParam(account0), "deposit - 1");

            await stakeInfo(ctx, account0, "UserStakeInfo - After");
            let [, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After - 1");
            let [, availableBalance] = await vdodoBalance(ctxVdodo, account0, "vDODOBalance - after");

            assert.equal(pendingReward, decimalStr("10"));
            assert.equal(availableBalance, "90063636363636363600");
        });


        it("withdraw", async () => {
            await mint(ctxVdodo, account0, decimalStr("10000"), dodoTeam);
            await vdodoBalance(ctxVdodo, account0, "vDODOBalance - before");

            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 102, decimalStr("10"));
            await stakeInfo(ctx, account0, "UserStakeInfo - Before");
            await getRewardInfo(ctx, 0, account0, "UserRewardInfo - Before");

            await ctx.increBlock(3);

            await logGas(await ctx.VDODOMine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit");

            await ctx.increBlock(3);

            await logGas(await ctx.VDODOMine.methods.withdraw(
                decimalStr("5")
            ), ctx.sendParam(account0), "withdraw");

            await stakeInfo(ctx, account0, "UserStakeInfo - After");
            let [, pendingReward] = await getRewardInfo(ctx, 0, account0, "UserRewardInfo - After");
            let [, availableBalance] = await vdodoBalance(ctxVdodo, account0, "vDODOBalance - after");

            assert.equal(pendingReward, decimalStr("40"));
            assert.equal(availableBalance, "95090909090909090900");
        });


        it("revert case", async () => {
            await mint(ctxVdodo, account0, decimalStr("10000"), dodoTeam);

            var curBlock = await ctx.Web3.eth.getBlockNumber();
            await addRewardToken(ctx, ctx.REWARD_1, curBlock + 2, curBlock + 102, decimalStr("10"));

            //增加区块
            await ctx.increBlock(3);

            await logGas(await ctx.VDODOMine.methods.deposit(
                decimalStr("10")
            ), ctx.sendParam(account0), "deposit - 0");

            await truffleAssert.reverts(
                ctxVdodo.VDODO.methods.redeem(decimalStr("95"), false).send(ctxVdodo.sendParam(account0)),
                "vDODOToken: available amount not enough"
            )
        })
    })
});
