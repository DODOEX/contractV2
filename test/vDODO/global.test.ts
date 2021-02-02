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

            //change-reward

            //改变后状态
        });


        it("donate", async () => {
            //改变前alpha lastRewardBlock 状态

            //change-reward

            //改变后状态
        });

        it("read-helper", async () => {
            //不同amount对应的feeRatio （5 5-15 15）
        });
    })
});
