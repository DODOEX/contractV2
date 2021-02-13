/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { VDODOContext, getVDODOContext } from '../utils/VDODOContext';
import { assert } from 'chai';
import BigNumber from 'bignumber.js';
const truffleAssert = require('truffle-assertions');

let account0: string;
let account1: string;
let account2: string;
let account3: string;
let dodoTeam: string;
let defaultSuperAddress: string;
let owner: string;

async function init(ctx: VDODOContext): Promise<void> {
    dodoTeam = ctx.Deployer;
    account0 = ctx.SpareAccounts[0];
    account1 = ctx.SpareAccounts[1];
    account2 = ctx.SpareAccounts[2];
    account3 = ctx.SpareAccounts[3];
    defaultSuperAddress = ctx.Maintainer
    owner = ctx.Deployer

    await ctx.mintTestToken(account0, decimalStr("1000"));
    await ctx.mintTestToken(account1, decimalStr("1000"));
    await ctx.mintTestToken(account2, decimalStr("1000"));
    await ctx.mintTestToken(account3, decimalStr("1000"));

    await ctx.approveProxy(account0);
    await ctx.approveProxy(account1);
    await ctx.approveProxy(account2);
    await ctx.approveProxy(account3);

    await ctx.VDODO.methods.setCantransfer(true).send(ctx.sendParam(owner))
}

async function getGlobalState(ctx: VDODOContext, logInfo?: string) {
    let [alpha,] = await ctx.VDODO.methods.getLatestAlpha().call();
    var lastRewardBlock = await ctx.VDODO.methods._LAST_REWARD_BLOCK_().call();
    var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
    // console.log(logInfo + " alpha:" + fromWei(alpha, 'ether') + " lastRewardBlock:" + lastRewardBlock + " totalSuppy:" + fromWei(totalSuppy, 'ether'));
    return [alpha, lastRewardBlock, totalSuppy]
}

async function dodoBalance(ctx: VDODOContext, user: string, logInfo?: string) {
    var dodo_contract = await ctx.DODO.methods.balanceOf(ctx.VDODO.options.address).call();
    var dodo_account = await ctx.DODO.methods.balanceOf(user).call();

    // console.log(logInfo + " DODO:" + fromWei(dodo_contract, 'ether') + " account:" + fromWei(dodo_account, 'ether'));
    return [dodo_contract, dodo_account]
}

async function getUserInfo(ctx: VDODOContext, user: string, logInfo?: string) {
    var info = await ctx.VDODO.methods.userInfo(user).call();
    var res = {
        "stakingPower": info.stakingPower,
        "superiorSP": info.superiorSP,
        "superior": info.superior,
        "credit": info.credit
    }
    // console.log(logInfo + " stakingPower:" + fromWei(info.stakingPower, 'ether') + " superiorSP:" + fromWei(info.superiorSP, 'ether') + " superior:" + info.superior + " credit:" + fromWei(info.credit, 'ether'));
    return res
}

async function mint(ctx: VDODOContext, user: string, mintAmount: string, superior: string) {
    await ctx.VDODO.methods.mint(
        mintAmount,
        superior
    ).send(ctx.sendParam(user));
}

describe("vDODO-erc20", () => {
    let snapshotId: string;
    let ctx: VDODOContext;

    before(async () => {
        ctx = await getVDODOContext();
        //打开transfer开关
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("vdodo-erc20", () => {

        it("totalSupply", async () => {
            var lastRewardBlock = await ctx.VDODO.methods._LAST_REWARD_BLOCK_().call();
            var curBlock = await ctx.Web3.eth.getBlockNumber();
            console.log("init-block:" + lastRewardBlock + " blockNumber:" + curBlock)

            var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
            assert(totalSuppy, decimalStr("0.09"))
            await ctx.VDODO.methods.mint(decimalStr("10"), dodoTeam).send(ctx.sendParam(account0))
            var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
            assert(totalSuppy, decimalStr("0.2"))
            await ctx.VDODO.methods.mint(decimalStr("10"), dodoTeam).send(ctx.sendParam(account0))
            var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
            assert(totalSuppy, decimalStr("0.31"))
        })


        it("transfer-vdodo", async () => {
            //检查四个人 【包括from, to 以及各自的上级】，info变化
            //alpha lastRewardBlock
            //各自dodo余额变化

            let [, lastRewardBlockStart,] = await getGlobalState(ctx, "before");
            await ctx.VDODO.methods.mint(decimalStr("10"), dodoTeam).send(ctx.sendParam(account0))
            await ctx.VDODO.methods.mint(decimalStr("10"), account0).send(ctx.sendParam(account1))
            await ctx.VDODO.methods.mint(decimalStr("10"), account1).send(ctx.sendParam(account2))
            await ctx.VDODO.methods.mint(decimalStr("10"), account2).send(ctx.sendParam(account3))

            //增加一个区块
            await ctx.mintTestToken(account0, decimalStr("0"));
            let [alpha, lastRewardBlock,] = await getGlobalState(ctx, "after");


            assert.equal(alpha, "1195775916960005765");
            var totalSuppy = await ctx.VDODO.methods.totalSupply().call();

            assert.equal(totalSuppy, "540000000000000000");

            let userInfo0 = await getUserInfo(ctx, account0, "User0 ");
            assert.equal(userInfo0.stakingPower, "10916666666666666666");
            assert.equal(userInfo0.superiorSP, decimalStr("1"));
            assert.equal(userInfo0.credit, "999999999999999999");

            let userInfo1 = await getUserInfo(ctx, account1, "User1 ")
            assert.equal(userInfo1.stakingPower, "10045138888888888889");
            assert.equal(userInfo1.superiorSP, "916666666666666666");
            assert.equal(userInfo1.credit, "999999999999999999");

            let userInfo2 = await getUserInfo(ctx, account2, "User2 ");
            assert.equal(userInfo2.stakingPower, "9638792438271604945");
            assert.equal(userInfo2.superiorSP, "878472222222222222");
            assert.equal(userInfo2.credit, "999999999999999999");

            let userInfo3 = await getUserInfo(ctx, account3, "User3 ");
            assert.equal(userInfo3.stakingPower, "8540702160493827171");
            assert.equal(userInfo3.superiorSP, "854070216049382717");
            assert.equal(userInfo3.credit, decimalStr("0"));


            let [, dodo_u0] = await dodoBalance(ctx, account0, "start")
            assert.equal(dodo_u0, "990000000000000000000");
            let [, dodo_u1] = await dodoBalance(ctx, account1, "start")
            assert.equal(dodo_u1, "990000000000000000000");
            let [, dodo_u2] = await dodoBalance(ctx, account2, "start")
            assert.equal(dodo_u2, "990000000000000000000");
            let [, dodo_u3] = await dodoBalance(ctx, account3, "start")
            assert.equal(dodo_u3, "990000000000000000000");

            let account1Balance = await ctx.VDODO.methods.balanceOf(account1).call()
            await logGas(await ctx.VDODO.methods.transfer(
                account3,
                account1Balance
            ), ctx.sendParam(account1), "transfer");

            let userInfo0_after = await getUserInfo(ctx, account0, "userInfo0_after");
            let userInfo1_after = await getUserInfo(ctx, account1, "userInfo1_after");
            let userInfo2_after = await getUserInfo(ctx, account2, "userInfo2_after");
            let userInfo3_after = await getUserInfo(ctx, account3, "userInfo3_after");

            assert.equal(userInfo0_after.stakingPower, "10097456459435626102");
            assert.equal(userInfo0_after.superiorSP, decimalStr("1"));
            assert.equal(userInfo0_after.credit, "0");

            assert.equal(userInfo1_after.stakingPower, "1024213041698160810");
            assert.equal(userInfo1_after.superiorSP, "14574081947593859");
            assert.equal(userInfo1_after.credit, "999999999999999999");

            assert.equal(userInfo2_after.stakingPower, "10540885022990677752");
            assert.equal(userInfo2_after.superiorSP, "878472222222222222");
            assert.equal(userInfo2_after.credit, "2101173516585172447");

            assert.equal(userInfo3_after.stakingPower, "17561628007684555250");
            assert.equal(userInfo3_after.superiorSP, "1756162800768455524");
            assert.equal(userInfo3_after.credit, "0");

            let [alphaEnd, lastRewardBlockEnd, totalSuppyEnd] = await getGlobalState(ctx, "end");
            assert.equal(alphaEnd, "1220687915230005885");
            assert.equal(totalSuppyEnd, "550000000000000000");
            assert.equal(lastRewardBlockEnd, Number(lastRewardBlock) + 2);
        });

        it("transferFrom-vdodo", async () => {
            await ctx.VDODO.methods.mint(decimalStr("10"), dodoTeam).send(ctx.sendParam(account0))
            await ctx.VDODO.methods.mint(decimalStr("10"), dodoTeam).send(ctx.sendParam(account1))

            //增加一个区块
            await ctx.mintTestToken(account0, decimalStr("0"));
            let [alpha, lastRewardBlock,] = await getGlobalState(ctx, "after");

            assert.equal(alpha, "1138339920948616600");
            var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
            assert.equal(totalSuppy, "320000000000000000");

            let userInfo0 = await getUserInfo(ctx, account0, "User0 ");
            assert.equal(userInfo0.stakingPower, decimalStr("10"));
            assert.equal(userInfo0.superiorSP, decimalStr("1"));
            assert.equal(userInfo0.credit, "0");

            let userInfo1 = await getUserInfo(ctx, account1, "User1 ")
            assert.equal(userInfo1.stakingPower, "9166666666666666667");
            assert.equal(userInfo1.superiorSP, "916666666666666666");
            assert.equal(userInfo1.credit, decimalStr("0"));


            let [, dodo_u0] = await dodoBalance(ctx, account0, "start")
            assert.equal(dodo_u0, "990000000000000000000");
            let [, dodo_u1] = await dodoBalance(ctx, account1, "start")
            assert.equal(dodo_u1, "990000000000000000000");

            let account0Balance = await ctx.VDODO.methods.balanceOf(account0).call()
            await logGas(await ctx.VDODO.methods.approve(
                account2,
                account0Balance
            ), ctx.sendParam(account0), "approve");

            await logGas(await ctx.VDODO.methods.transferFrom(
                account0,
                account1,
                account0Balance
            ), ctx.sendParam(account2), "transferFrom");

            let userInfo0_after = await getUserInfo(ctx, account0, "userInfo0_after");
            let userInfo1_after = await getUserInfo(ctx, account1, "userInfo1_after");
            let userInfo2_after = await getUserInfo(ctx, account2, "userInfo2_after");

            assert.equal(userInfo0_after.stakingPower, "769230769230769236");
            assert.equal(userInfo0_after.superiorSP, "76923076923076924");
            assert.equal(userInfo0_after.credit, "0");

            assert.equal(userInfo1_after.stakingPower, "18397435897435897431");
            assert.equal(userInfo1_after.superiorSP, "1839743589743589742");
            assert.equal(userInfo1_after.credit, "0");

            assert.equal(userInfo2_after.stakingPower, "0");
            assert.equal(userInfo2_after.superiorSP, "0");
            assert.equal(userInfo2_after.credit, "0");

            let [alphaEnd, lastRewardBlockEnd, totalSuppyEnd] = await getGlobalState(ctx, "end");
            assert.equal(alphaEnd, "1233201581027667984");
            assert.equal(totalSuppyEnd, "340000000000000000");
            assert.equal(lastRewardBlockEnd, Number(lastRewardBlock) + 3);

            //再次transferFrom 预期revert
            //预期revert
            await truffleAssert.reverts(
                ctx.VDODO.methods.transferFrom(account0, account1, 1).send(ctx.sendParam(account2)),
                "ALLOWANCE_NOT_ENOUGH"
            )
        });

        it("transfer - close", async () => {

            await ctx.VDODO.methods.setCantransfer(false).send(ctx.sendParam(owner))

            await ctx.VDODO.methods.mint(decimalStr("10"), dodoTeam).send(ctx.sendParam(account0))
            assert.equal(
                await ctx.DODO.methods.balanceOf(account0).call(),
                decimalStr("990")
            );
            assert.equal(
                await ctx.DODO.methods.balanceOf(ctx.VDODO.options.address).call(),
                decimalStr("10010")
            );

            assert.equal(
                await ctx.VDODO.methods.balanceOf(account0).call(),
                decimalStr("0.1")
            );

            assert.equal(
                await ctx.VDODO.methods.balanceOf(dodoTeam).call(),
                decimalStr("0")
            );

            //预期revert
            await truffleAssert.reverts(
                ctx.VDODO.methods.transfer(account1, 1).send(ctx.sendParam(account0)),
                "vDODOToken: not allowed transfer"
            )
            //revert 触发产生区块，造成vdodo增加
            assert.equal(
                await ctx.VDODO.methods.balanceOf(account0).call(),
                "109090909090909090"
            );
            assert.equal(
                await ctx.VDODO.methods.balanceOf(account1).call(),
                decimalStr("0")
            );
        });
    })
});
