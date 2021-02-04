/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { VDODOContext, getVDODOContext } from '../utils/VDODOContext';
import { assert } from 'chai';
import BigNumber from 'bignumber.js';

let account0: string;
let account1: string;

async function init(ctx: VDODOContext): Promise<void> {
    account0 = ctx.SpareAccounts[0];
    account1 = ctx.SpareAccounts[1];

    await ctx.mintTestToken(account0, decimalStr("1000"));
    await ctx.mintTestToken(account1, decimalStr("1000"));

    await ctx.approveProxy(account0);
    await ctx.approveProxy(account1);
}

async function getGlobalState(ctx: VDODOContext, logInfo?: string) {
    var alpha = await ctx.VDODO.methods.getLatestAlpha().call();
    var lastRewardBlock = await ctx.VDODO.methods.lastRewardBlock().call();
    var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
    var dodoPerBlock = await ctx.VDODO.methods.dodoPerBlock().call();
    // console.log(logInfo + "==> alpha:" + fromWei(alpha, 'ether') + " lastRewardBlock:" + lastRewardBlock + " totalSuppy:" + fromWei(totalSuppy, 'ether')+ " dodoPerBlock:" + fromWei(dodoPerBlock, 'ether'));
    return [alpha, lastRewardBlock,dodoPerBlock]
  }
describe("vDODO-owner", () => {
    let snapshotId: string;
    let ctx: VDODOContext;

    before(async () => {
        ctx = await getVDODOContext();
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("vdodo-erc20", () => {

        it("change-reward", async () => {
            //改变前alpha lastRewardBlock 状态
            let [alpha,lastRewardBlock,dodoPerBlock] =  await getGlobalState(ctx, "before");

            //change-reward
            await ctx.VDODO.methods.changePerReward(decimalStr("2")).send(ctx.sendParam(ctx.Deployer))
            //改变后状态
            let [alphaAfter,lastRewardBlockAfter,dodoPerBlockAfter] =  await getGlobalState(ctx, "after");

            assert.equal(
                await lastRewardBlock,
                Number(lastRewardBlockAfter)-7
            );
            assert.equal(//totalSupply==0
                await alpha,
                alphaAfter
            );
            assert.notEqual(
                await dodoPerBlock,
                dodoPerBlockAfter
            );
        });


        it("donate", async () => {
            //改变前alpha lastRewardBlock 状态
            let [before,lastRewardBlock,] = await getGlobalState(ctx, "before");

            await logGas(await ctx.VDODO.methods.mint(
                decimalStr("100"),
                account1
              ), ctx.sendParam(account0), "mint-fisrt");
        
            await logGas(await ctx.VDODO.methods.donate(
                decimalStr("100")
            ), ctx.sendParam(account0), "donate");

        
            let [alphaAfter,lastRewardBlockAfter,] = await getGlobalState(ctx, "after");
            assert.notEqual(
                before, 
                alphaAfter
            );
            assert.equal(
                alphaAfter, 
                "191818181818181818180"//newAlpha +amount/totalSupply
            );
            assert.equal(
                lastRewardBlock,
                Number(lastRewardBlockAfter)-7
            );
        });
        it("read-helper", async () => {
            //不同amount对应的feeRatio （5 5-15 15）
            let ratio0 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("0.2")).call()//<=1 ->5
            assert.equal(
                ratio0,
                decimalStr("0.05")
            );

            let ratio1 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("11")).call()//>=10 ->15
            assert.equal(
                ratio1,
                decimalStr("0.15")
            );

            let ratio2 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("6")).call()//-->5-15
            assert.equal(
                ratio2,
                decimalStr("0.066852058071690192")
            );
            // console.log("ratio2 = "+ fromWei(ratio2, 'ether'));
            assert.isAbove(Number(ratio2),Number(ratio0))
            assert.isBelow(Number(ratio2),Number(ratio1))
            
        });
    })
});
