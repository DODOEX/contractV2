/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { VDODOContext, getVDODOContext } from '../utils/VDODOContext';
import { assert } from 'chai';

let account0: string;
let account1: string;
let account2: string;
let account3: string;
let account4: string;

async function init(ctx: VDODOContext): Promise<void> {
  account0 = ctx.SpareAccounts[0];
  account1 = ctx.SpareAccounts[1];
  account2 = ctx.SpareAccounts[2];
  account3 = ctx.SpareAccounts[3];
  account4 = ctx.SpareAccounts[4];

  await ctx.mintTestToken(account0, decimalStr("100000"));
  await ctx.mintTestToken(account1, decimalStr("1000"));
  await ctx.mintTestToken(account2, decimalStr("1000"));
  await ctx.mintTestToken(account3, decimalStr("1000"));
  await ctx.mintTestToken(account4, decimalStr("1000"));

  await ctx.approveProxy(account0);
  await ctx.approveProxy(account1);
  await ctx.approveProxy(account2);
  await ctx.approveProxy(account3);
  await ctx.approveProxy(account4);
}

async function getGlobalState(ctx: VDODOContext, logInfo?: string) {
  var alpha = await ctx.VDODO.methods.getLatestAlpha().call();
  var lastRewardBlock = await ctx.VDODO.methods.lastRewardBlock().call();
  var totalSuppy = await ctx.VDODO.methods.totalSupply().call();
  console.log(logInfo + " alpha:" + fromWei(alpha, 'ether') + " lastRewardBlock:" + lastRewardBlock + " totalSuppy:" + fromWei(totalSuppy, 'ether'));
  return [alpha, lastRewardBlock]
}

async function dodoBalance(ctx: VDODOContext, user: string, logInfo?: string) {
  var dodo_contract = await ctx.DODO.methods.balanceOf(ctx.VDODO.options.address).call();
  var dodo_account = await ctx.DODO.methods.balanceOf(user).call();

  console.log(logInfo + " DODO:" + fromWei(dodo_contract, 'ether') + " account:" + fromWei(dodo_account, 'ether'));
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
  console.log(logInfo + " VDODOAmount:" + fromWei(info.VDODOAmount, 'ether') + " superiorVDODO:" + fromWei(info.superiorVDODO, 'ether') + " superior:" + info.superior + " credit:" + fromWei(info.credit, 'ether'));
  return res
}

async function mint(ctx: VDODOContext, user: string, mintAmount: string, superior: string) {
  await ctx.VDODO.methods.mint(
    mintAmount,
    superior
  ).send(ctx.sendParam(user));
}

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
      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, account1, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.mint(
        decimalStr("100"),
        account1
      ), ctx.sendParam(account0), "mint-fisrt");

      //增加两个区块
      await ctx.mintTestToken(account0, decimalStr("0"));
      await ctx.mintTestToken(account0, decimalStr("0"));

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, account1, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "101818181818181818181");
      assert.equal(userInfo.VDODOAmount, "1000000000000000000");
      assert.equal(userInfo.superiorVDODO, "100000000000000000");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, account1);

      assert.equal(superiorInfo.VDODOAmount, "100000000000000000");
      assert.equal(superiorInfo.superiorVDODO, "0");
      assert.equal(superiorInfo.credit, "10000000000000000000");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "99900000000000000000000")
    });

    it("vdodo-mint-second", async () => {
      await mint(ctx, account0, decimalStr("100"), account1)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, account1, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.mint(
        decimalStr("100"),
        account1
      ), ctx.sendParam(account0), "mint-second");

      //增加一个区块
      await ctx.mintTestToken(account0, decimalStr("0"));

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, account1, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "101365693130399012751");
      assert.equal(userInfo.VDODOAmount, "1990990990990990990");
      assert.equal(userInfo.superiorVDODO, "199099099099099099");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, account1);

      assert.equal(superiorInfo.VDODOAmount, "199099099099099099");
      assert.equal(superiorInfo.superiorVDODO, "0");
      assert.equal(superiorInfo.credit, "19999999999999999990");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "99800000000000000000000")
    });


    it("vdodo-mint-second-otherSuperior", async () => {
      await mint(ctx, account0, decimalStr("100"), account1)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, account1, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.mint(
        decimalStr("100"),
        account2
      ), ctx.sendParam(account0), "mint-second");

      //增加一个区块
      await ctx.mintTestToken(account0, decimalStr("0"));

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, account1, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "101365693130399012751");
      assert.equal(userInfo.VDODOAmount, "1990990990990990990");
      assert.equal(userInfo.superiorVDODO, "199099099099099099");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, account1);

      assert.equal(superiorInfo.VDODOAmount, "199099099099099099");
      assert.equal(superiorInfo.superiorVDODO, "0");
      assert.equal(superiorInfo.credit, "19999999999999999990");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      let otherInfo = await getUserInfo(ctx, account2, "Superior after")

      assert.equal(otherInfo.VDODOAmount, "0");
      assert.equal(otherInfo.superiorVDODO, "0");
      assert.equal(otherInfo.credit, "0");
      assert.equal(otherInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "99800000000000000000000")
    });


    it("redeem-amount-read", async () => {
      await mint(ctx, account0, decimalStr("100"), account1)

      let [dodoReceive, burnDodoAmount, withdrawFeeDodoAmount] = await ctx.VDODO.methods.getWithdrawAmount(decimalStr("1")).call();

      assert.equal(dodoReceive, decimalStr("85"));
      assert.equal(burnDodoAmount, decimalStr("0"));
      assert.equal(withdrawFeeDodoAmount, decimalStr("15"));
    });


    it("redeem-partial-haveMint", async () => {
      await mint(ctx, account0, decimalStr("10000"), account1)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, account1, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.redeem(decimalStr("10")), ctx.sendParam(account0), "redeem-partial-haveMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, account1, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "101524380165289256197");
      assert.equal(userInfo.VDODOAmount, "90000000000000000000");
      assert.equal(userInfo.superiorVDODO, "9000000000000000000");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, account1);

      assert.equal(superiorInfo.VDODOAmount, "9000000000000000000");
      assert.equal(superiorInfo.superiorVDODO, "0");
      assert.equal(superiorInfo.credit, "899990909090909090910");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "90850077272727272727265")

    });


    it("redeem-partial-NotMint", async () => {
      //多个下级引用
      await mint(ctx, account1, decimalStr("100"), account0)
      await mint(ctx, account2, decimalStr("100"), account0)
      await mint(ctx, account3, decimalStr("100"), account0)
      await mint(ctx, account4, decimalStr("100"), account0)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, account3, "One of referer before");
      await dodoBalance(ctx, account0, "before")

      let account0VdodoAmount = await ctx.VDODO.methods.balanceOf(account0).call()

      await logGas(await ctx.VDODO.methods.redeem((account0VdodoAmount - 3000) + ""), ctx.sendParam(account0), "redeem-partial-NotMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, account3, "One of referer after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "101909933011338172201");
      assert.equal(userInfo.VDODOAmount, "393425809544634067");
      assert.equal(userInfo.superiorVDODO, "0");
      assert.equal(userInfo.credit, "39999999999999999876");
      assert.equal(userInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(superiorInfo.VDODOAmount, "986527067608148689");
      assert.equal(superiorInfo.superiorVDODO, "98652706760814868");
      assert.equal(superiorInfo.credit, "0");
      assert.equal(superiorInfo.superior, account0);

      assert.equal(dodo_u, "100000232341473424735076")
    });


    it("redeem-all-haveMint", async () => {
      //第一笔mint不动，防止totalSupply过小
      await mint(ctx, account0, decimalStr("10000"), account1)
      await mint(ctx, account1, decimalStr("100"), account2)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account1, "User before");
      await getUserInfo(ctx, account2, "Superior before")
      await dodoBalance(ctx, account1, "before")

      let account1VdodoAmount = await ctx.VDODO.methods.balanceOf(account1).call()

      await logGas(await ctx.VDODO.methods.redeem(account1VdodoAmount), ctx.sendParam(account1), "redeem-all-haveMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account1, "User after");
      let superiorInfo = await getUserInfo(ctx, account2, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account1, "after")

      assert.equal(alpha, "100154592821433302856");
      assert.equal(userInfo.VDODOAmount, "9999090991728024725");
      assert.equal(userInfo.superiorVDODO, "0");
      assert.equal(userInfo.credit, "1000000000000000000000");
      assert.equal(userInfo.superior, account2);

      assert.equal(superiorInfo.VDODOAmount, "8998462015594");
      assert.equal(superiorInfo.superiorVDODO, "0");
      assert.equal(superiorInfo.credit, "0");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "985084929758388492933")

    });


    it("redeem-all-NoMint", async () => {
      //多个下级引用
      await mint(ctx, account1, decimalStr("100"), account0)
      await mint(ctx, account2, decimalStr("100"), account0)
      await mint(ctx, account3, decimalStr("100"), account0)
      await mint(ctx, account4, decimalStr("100"), account0)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, account3, "One of referer before");
      await dodoBalance(ctx, account0, "before")

      let account0VdodoAmount = await ctx.VDODO.methods.balanceOf(account0).call()

      await logGas(await ctx.VDODO.methods.redeem(account0VdodoAmount), ctx.sendParam(account0), "redeem-all-NotMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, account3, "One of referer after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "101909933011338182738");
      assert.equal(userInfo.VDODOAmount, "393425809544631067");
      assert.equal(userInfo.superiorVDODO, "0");
      assert.equal(userInfo.credit, "39999999999999999876");
      assert.equal(userInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(superiorInfo.VDODOAmount, "986527067608148689");
      assert.equal(superiorInfo.superiorVDODO, "98652706760814868");
      assert.equal(superiorInfo.credit, "0");
      assert.equal(superiorInfo.superior, account0);

      assert.equal(dodo_u, "100000232341473424994923")
    });
  })
});
