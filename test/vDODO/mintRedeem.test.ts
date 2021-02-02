/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

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

//TODO: 抽象出来mint func

describe("VDODO", () => {
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

  describe("vdodo", () => {

    it("vdodo-mint-first", async () => {
      //第一次mint 后
      //alpha lastRewardBlock 状态
      //user superior info 状态
      //vDODO 总量变化，以及vDODO合约dodo余额，user dodo余额

    });

    it("vdodo-mint-second", async () => {
      //第二次mint 后（传入之前的superior地址）
      //alpha lastRewardBlock 状态
      //user superior info 状态
      //vDODO 总量变化，以及vDODO合约dodo余额，user dodo余额
    });


    it("vdodo-mint-second-otherSuperior", async () => {
      //第二次mint 后（传入非之前superior地址）
      //alpha lastRewardBlock 状态
      //user superior info 状态
      //vDODO 总量变化，以及vDODO合约dodo余额，user dodo余额
    });


    it("redeem-amount-read", async () => {
      //正确读取 withdrawAmount 字段
    });

    it("redeem-partial-haveMint", async () => {

    });

    it("redeem-partial-NotMint", async () => {
      //多个下级引用
      
    });

    it("redeem-all-haveMint", async () => {

    });

    it("redeem-all-NoMint", async () => {
      //多个下级引用
    });


    // it("vdodo first mint with no superior", async () => {

    //   await ctx.VDODO.methods.mint(decimalStr("10"),"0x0000000000000000000000000000000000000000").send(ctx.sendParam(account0))
    //   assert.equal(
    //     await ctx.DODO.methods.balanceOf(account0).call(),
    //     decimalStr("990")
    //   );
    //   assert.equal(
    //     await await ctx.VDODO.methods.alpha().call(),
    //     await ctx.alpha
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
    //     await ctx.VDODO.methods.totalSupply().call(),
    //     decimalStr("0.1")
    //   );
    //   assert.notEqual(
    //     await ctx.VDODO.methods.lastRewardBlock().call(),
    //     ctx.lastRewardBlock
    //   );
    // });

  })
});
