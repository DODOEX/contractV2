/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, MAX_UINT256 } from '../utils/Converter';
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
        });

        it("transferFrom-vdodo", async () => {
            //检查四个人 【包括from, to 以及各自的上级】，info变化
            //alpha lastRewardBlock
            //各自dodo余额变化
            //approve 状态变化


            //再次transferFrom 预期revert
        });

        it("transfer - close", async () => {
            //预期revert
        });


        // it("vdodo owner can transfer", async () => {

        //   await ctx.VDODO.methods.mint(decimalStr("10"),"0x0000000000000000000000000000000000000000").send(ctx.sendParam(account0))
        //   assert.equal(
        //     await ctx.DODO.methods.balanceOf(account0).call(),
        //     decimalStr("990")
        //   );
        //   assert.equal(
        //     await ctx.DODO.methods.balanceOf(ctx.VDODO.options.address).call(),
        //     decimalStr("10")
        //   );
        //   assert.equal(
        //     await ctx.VDODO.methods.balanceOf(account0).call(),
        //     decimalStr("0.1")
        //   );
        //   assert.equal(
        //     await ctx.VDODO.methods.balanceOf(account1).call(),
        //     decimalStr("0")
        //   );


        //   await truffleAssert.reverts(
        //      ctx.VDODO.methods.transfer(account1,decimalStr("0.1")).send(ctx.sendParam(account0)),
        //     "vDODOToken: not allowed transfer"
        //   )
        //   assert.equal(
        //     await ctx.VDODO.methods.balanceOf(account0).call(),
        //     decimalStr("0.1")
        //   );
        //   assert.equal(
        //     await ctx.VDODO.methods.balanceOf(account1).call(),
        //     decimalStr("0")
        //   );

        // });
    })
});
