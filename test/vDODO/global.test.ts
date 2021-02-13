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
let dodoTeam: string;

async function init(ctx: VDODOContext): Promise<void> {
    dodoTeam = ctx.Deployer;
    account0 = ctx.SpareAccounts[0];
    account1 = ctx.SpareAccounts[1];

    await ctx.mintTestToken(account0, decimalStr("1000"));
    await ctx.mintTestToken(account1, decimalStr("1000"));

    await ctx.approveProxy(account0);
    await ctx.approveProxy(account1);
}

async function getGlobalState(ctx: VDODOContext, logInfo?: string) {
    let [alpha,] = await ctx.VDODO.methods.getLatestAlpha().call();
    var lastRewardBlock = await ctx.VDODO.methods._LAST_REWARD_BLOCK_().call();
    var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
    var dodoPerBlock = await ctx.VDODO.methods._DODO_PER_BLOCK_().call();
    console.log(logInfo + "==> alpha:" + fromWei(alpha, 'ether') + " lastRewardBlock:" + lastRewardBlock + " totalSuppy:" + fromWei(totalSuppy, 'ether') + " dodoPerBlock:" + fromWei(dodoPerBlock, 'ether'));
    return [alpha, lastRewardBlock, dodoPerBlock]
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
            let [alpha, lastRewardBlock, dodoPerBlock] = await getGlobalState(ctx, "before");
            //change-reward
            await ctx.VDODO.methods.changePerReward(decimalStr("2")).send(ctx.sendParam(ctx.Deployer))
            //改变后状态
            let [alphaAfter, lastRewardBlockAfter, dodoPerBlockAfter] = await getGlobalState(ctx, "after");

            assert.equal(//totalSupply==0
                alpha,
                "1000000000000000000"
            );

            assert.notEqual(
                await dodoPerBlock,
                "2000000000000000000"
            );
        });


        it("donate", async () => {
            //改变前alpha lastRewardBlock 状态
            await logGas(await ctx.VDODO.methods.mint(
                decimalStr("100"),
                dodoTeam
            ), ctx.sendParam(account0), "mint-fisrt");

            let [alphaBefore, lastRewardBlock,] = await getGlobalState(ctx, "before");

            await logGas(await ctx.VDODO.methods.donate(
                decimalStr("100")
            ), ctx.sendParam(account0), "donate");


            let [alphaAfter, lastRewardBlockAfter,] = await getGlobalState(ctx, "after");

            assert.equal(
                alphaBefore,
                "1000000000000000000"
            );
            assert.equal(
                alphaAfter,
                "1918181818181818180"//newAlpha +amount/totalSupply
            );
            assert.equal(
                lastRewardBlock,
                lastRewardBlockAfter
            );
        });

        it("read-helper", async () => {
            let ratio0 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("0.51")).call()
            assert.equal(
                ratio0,
                decimalStr("0.05")
            );

            let ratio1 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("0.5")).call()
            assert.equal(
                ratio1,
                decimalStr("0.05")
            );

            let ratio2 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("0.09")).call()
            assert.equal(
                ratio2,
                decimalStr("0.15")
            );

            let ratio3 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("0.1")).call()
            assert.equal(
                ratio3,
                decimalStr("0.15")
            );

            let ratio4 = await ctx.DODOCirculationHelper.methods.geRatioValue(decimalStr("0.3")).call()
            assert.equal(
                ratio4,
                decimalStr("0.1")
            );
        });
    })
});
