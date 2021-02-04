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
let defaultSuperAddress: string;
let owner: string;

async function init(ctx: VDODOContext): Promise<void> {
    account0 = ctx.SpareAccounts[0];
    account1 = ctx.SpareAccounts[1];
    account2 = ctx.SpareAccounts[2];
    account3 = ctx.SpareAccounts[3];
    defaultSuperAddress = ctx.Maintainer
    owner = ctx.Deployer

    await ctx.mintTestToken(account0, decimalStr("1000"));
    await ctx.mintTestToken(account2, decimalStr("1000"));

    await ctx.approveProxy(account0);
    await ctx.approveProxy(account1);
    await ctx.approveProxy(account2);
    await ctx.approveProxy(account3);

    await ctx.VDODO.methods.setCantransfer(true).send(ctx.sendParam(owner))
}

async function getGlobalState(ctx: VDODOContext, logInfo?: string) {
    var alpha = await ctx.VDODO.methods.getLatestAlpha().call();
    var lastRewardBlock = await ctx.VDODO.methods.lastRewardBlock().call();
    var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
    // console.log(logInfo + " alpha:" + fromWei(alpha, 'ether') + " lastRewardBlock:" + lastRewardBlock + " totalSuppy:" + fromWei(totalSuppy, 'ether'));
    return [alpha, lastRewardBlock,totalSuppy]
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
      "VDODOAmount": info.VDODOAmount,
      "superiorVDODO": info.superiorVDODO,
      "superior": info.superior,
      "credit": info.credit
    }
    // console.log(logInfo + " VDODOAmount:" + fromWei(info.VDODOAmount, 'ether') + " superiorVDODO:" + fromWei(info.superiorVDODO, 'ether') + " superior:" + info.superior + " credit:" + fromWei(info.credit, 'ether'));
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

        it("transfer-vdodo", async () => {
            //检查四个人 【包括from, to 以及各自的上级】，info变化
            //alpha lastRewardBlock
            //各自dodo余额变化

            let [,lastRewardBlockStart,] = await getGlobalState(ctx, "before");
            await ctx.VDODO.methods.mint(decimalStr("10"),account1).send(ctx.sendParam(account0))
            await ctx.VDODO.methods.mint(decimalStr("10"),account3).send(ctx.sendParam(account2))

            //增加一个区块
            await ctx.mintTestToken(account0, decimalStr("0"));
            let [alpha,lastRewardBlock,] = await getGlobalState(ctx, "after");
            
            assert.equal(lastRewardBlock,Number(lastRewardBlockStart)+11);

            assert.equal(alpha, "113833992094861660108");
            var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
            assert.equal(
                totalSuppy
                , decimalStr("0.210833333333333332"));

        

            let userInfo0 = await getUserInfo(ctx, account0, "User0 ");
            assert.equal(userInfo0.VDODOAmount, decimalStr("0.1"));
            assert.equal(userInfo0.superiorVDODO, decimalStr("0.01"));
            assert.equal(userInfo0.credit, "0");
            let userInfo1 = await getUserInfo(ctx, account1, "User0 Superior ")
            assert.equal(userInfo1.VDODOAmount, decimalStr("0.01"));
            assert.equal(userInfo1.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo1.credit, decimalStr("1"));

            let userInfo2 = await getUserInfo(ctx, account2, "User2 ");
            assert.equal(userInfo2.VDODOAmount, decimalStr("0.091666666666666666"));
            assert.equal(userInfo2.superiorVDODO, decimalStr("0.009166666666666666"));
            assert.equal(userInfo2.credit, decimalStr("0"));
            let userInfo3 = await getUserInfo(ctx, account3, "User2 Superior");
            assert.equal(userInfo3.VDODOAmount, decimalStr("0.009166666666666666"));
            assert.equal(userInfo3.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo3.credit, decimalStr("0.999999999999999928"));


            let [, dodo_u0] = await dodoBalance(ctx, account0, "start")
            assert.equal(dodo_u0, "990000000000000000000");
            let [, dodo_u1] = await dodoBalance(ctx, account1, "start")
            assert.equal(dodo_u1, "0");
            let [, dodo_u2] = await dodoBalance(ctx, account2, "start")
            assert.equal(dodo_u2, "990000000000000000000");
            let [, dodo_u3] = await dodoBalance(ctx, account3, "start")
            assert.equal(dodo_u3, "0");

            await logGas(await ctx.VDODO.methods.transfer(
                account2,
                decimalStr("0.1")
              ), ctx.sendParam(account0), "transfer");
        

            // await ctx.VDODO.methods.transfer(account2,decimalStr("0.1")).send(ctx.sendParam(account0))

            let userInfo0_after = await getUserInfo(ctx, account0, "userInfo0_after");
            let userInfo1_after = await getUserInfo(ctx, account1, "userInfo1_after");
            let userInfo2_after = await getUserInfo(ctx, account2, "userInfo2_after");
            let userInfo3_after = await getUserInfo(ctx, account3, "userInfo3_after");
            

            assert.equal(userInfo0_after.VDODOAmount, "0");
            assert.equal(userInfo0_after.superiorVDODO, "0");
            assert.equal(userInfo0_after.credit, "0");

            assert.equal(userInfo1_after.VDODOAmount, decimalStr("0.001566666666666667"));
            assert.equal(userInfo1_after.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo1_after.credit, "0");

            assert.equal(userInfo2_after.VDODOAmount, decimalStr("0.191666666666666666"));
            assert.equal(userInfo2_after.superiorVDODO, decimalStr("0.019166666666666666"));
            assert.equal(userInfo2_after.credit, "0");

            assert.equal(userInfo3_after.VDODOAmount, decimalStr("0.019166666666666666"));
            assert.equal(userInfo3_after.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo3_after.credit, decimalStr("2.185770750988142222"));



            let [alphaEnd,lastRewardBlockEnd,totalSuppyEnd] = await getGlobalState(ctx, "end");
            assert.equal(alphaEnd, decimalStr("118.577075098814229308"));
            assert.equal(totalSuppyEnd, decimalStr("0.212399999999999999"));
            assert.equal(lastRewardBlockEnd,Number(lastRewardBlock)+2);


            let [, dodo_u0_end] = await dodoBalance(ctx, account0, "end")
            assert.equal(dodo_u0_end, "990000000000000000000");
            let [, dodo_u1_end] = await dodoBalance(ctx, account1, "end")
            assert.equal(dodo_u1_end, "0");
            let [, dodo_u2_end] = await dodoBalance(ctx, account2, "end")
            assert.equal(dodo_u2_end, "990000000000000000000");
            let [, dodo_u3_end] = await dodoBalance(ctx, account3, "end")
            assert.equal(dodo_u3_end, "0");
            
        });

        it("transferFrom-vdodo", async () => {
            //检查四个人 【包括from, to 以及各自的上级】，info变化
            //alpha lastRewardBlock
            //各自dodo余额变化
            //approve 状态变化

            let [,lastRewardBlockStart,] = await getGlobalState(ctx, "before");
            await ctx.VDODO.methods.mint(decimalStr("10"),account1).send(ctx.sendParam(account0))
            await ctx.VDODO.methods.mint(decimalStr("10"),account3).send(ctx.sendParam(account2))

            //增加一个区块
            await ctx.mintTestToken(account0, decimalStr("0"));
            let [alpha,lastRewardBlock,] = await getGlobalState(ctx, "after");
            
            assert.equal(lastRewardBlock,Number(lastRewardBlockStart)+11);

            assert.equal(alpha, "113833992094861660108");
            var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
            assert.equal(
                totalSuppy
                , decimalStr("0.210833333333333332"));

        

            let userInfo0 = await getUserInfo(ctx, account0, "User0 ");
            assert.equal(userInfo0.VDODOAmount, decimalStr("0.1"));
            assert.equal(userInfo0.superiorVDODO, decimalStr("0.01"));
            assert.equal(userInfo0.credit, "0");
            let userInfo1 = await getUserInfo(ctx, account1, "User0 Superior ")
            assert.equal(userInfo1.VDODOAmount, decimalStr("0.01"));
            assert.equal(userInfo1.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo1.credit, decimalStr("1"));

            let userInfo2 = await getUserInfo(ctx, account2, "User2 ");
            assert.equal(userInfo2.VDODOAmount, decimalStr("0.091666666666666666"));
            assert.equal(userInfo2.superiorVDODO, decimalStr("0.009166666666666666"));
            assert.equal(userInfo2.credit, decimalStr("0"));
            let userInfo3 = await getUserInfo(ctx, account3, "User2 Superior");
            assert.equal(userInfo3.VDODOAmount, decimalStr("0.009166666666666666"));
            assert.equal(userInfo3.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo3.credit, decimalStr("0.999999999999999928"));


            let [, dodo_u0] = await dodoBalance(ctx, account0, "start")
            assert.equal(dodo_u0, "990000000000000000000");
            let [, dodo_u1] = await dodoBalance(ctx, account1, "start")
            assert.equal(dodo_u1, "0");
            let [, dodo_u2] = await dodoBalance(ctx, account2, "start")
            assert.equal(dodo_u2, "990000000000000000000");
            let [, dodo_u3] = await dodoBalance(ctx, account3, "start")
            assert.equal(dodo_u3, "0");


            await logGas(await ctx.VDODO.methods.approve(
                account3,
                decimalStr("0.1")
            ), ctx.sendParam(account0), "approve");

            await logGas(await ctx.VDODO.methods.transferFrom(
                account0,
                account2,
                decimalStr("0.1")
            ), ctx.sendParam(account3), "transferFrom");

            let userInfo0_after = await getUserInfo(ctx, account0, "userInfo0_after");
            let userInfo1_after = await getUserInfo(ctx, account1, "userInfo1_after");
            let userInfo2_after = await getUserInfo(ctx, account2, "userInfo2_after");
            let userInfo3_after = await getUserInfo(ctx, account3, "userInfo3_after");
            

            assert.equal(userInfo0_after.VDODOAmount, "0");
            assert.equal(userInfo0_after.superiorVDODO, "0");
            assert.equal(userInfo0_after.credit, "0");

            assert.equal(userInfo1_after.VDODOAmount, decimalStr("0.001891025641025642"));
            assert.equal(userInfo1_after.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo1_after.credit, "0");

            assert.equal(userInfo2_after.VDODOAmount, decimalStr("0.191666666666666666"));
            assert.equal(userInfo2_after.superiorVDODO, decimalStr("0.019166666666666666"));
            assert.equal(userInfo2_after.credit, "0");

            assert.equal(userInfo3_after.VDODOAmount, decimalStr("0.019166666666666666"));
            assert.equal(userInfo3_after.superiorVDODO, decimalStr("0"));
            assert.equal(userInfo3_after.credit, decimalStr("2.233201581027667914"));



            let [alphaEnd,lastRewardBlockEnd,totalSuppyEnd] = await getGlobalState(ctx, "end");
            assert.equal(alphaEnd, decimalStr("123.320158102766798508"));
            assert.equal(totalSuppyEnd, decimalStr("0.212724358974358974"));
            assert.equal(lastRewardBlockEnd,Number(lastRewardBlock)+3);


            let [, dodo_u0_end] = await dodoBalance(ctx, account0, "end")
            assert.equal(dodo_u0_end, "990000000000000000000");
            let [, dodo_u1_end] = await dodoBalance(ctx, account1, "end")
            assert.equal(dodo_u1_end, "0");
            let [, dodo_u2_end] = await dodoBalance(ctx, account2, "end")
            assert.equal(dodo_u2_end, "990000000000000000000");
            let [, dodo_u3_end] = await dodoBalance(ctx, account3, "end")
            assert.equal(dodo_u3_end, "0");


            //再次transferFrom 预期revert
            //预期revert
            await truffleAssert.reverts(
                ctx.VDODO.methods.transferFrom(account0,account2,decimalStr("0.1")).send(ctx.sendParam(account3)),
                "ALLOWANCE_NOT_ENOUGH"
            )
        });

        it("transfer - close", async () => {

            await ctx.VDODO.methods.setCantransfer(false).send(ctx.sendParam(owner))
            
            await ctx.VDODO.methods.mint(decimalStr("10"),defaultSuperAddress).send(ctx.sendParam(account0))
            assert.equal(
                await ctx.DODO.methods.balanceOf(account0).call(),
                decimalStr("990")
            );
            assert.equal(
                await ctx.DODO.methods.balanceOf(ctx.VDODO.options.address).call(),
                decimalStr("100010")
            );
            assert.equal(
                await ctx.VDODO.methods.balanceOf(account0).call(),
                decimalStr("0.1")
            );
            
            assert.equal(
                await ctx.VDODO.methods.balanceOf(account1).call(),
                decimalStr("0")
            );
            //预期revert
            await truffleAssert.reverts(
                ctx.VDODO.methods.transfer(account1,decimalStr("0.1")).send(ctx.sendParam(account0)),
                "vDODOToken: not allowed transfer"
            )
            assert.equal(
                await ctx.VDODO.methods.balanceOf(account0).call(),
                decimalStr("0.1")
            );
            assert.equal(
                await ctx.VDODO.methods.balanceOf(account1).call(),
                decimalStr("0")
            );

        });
    })
});
