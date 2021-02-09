/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { VDODOContext, getVDODOContext } from '../utils/VDODOContext';
import { assert } from 'chai';

let dodoTeam: string;
let account0: string;
let account1: string;
let account2: string;
let account3: string;
let account4: string;

async function init(ctx: VDODOContext): Promise<void> {
  dodoTeam = ctx.Deployer;
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
  let [alpha,] = await ctx.VDODO.methods.getLatestAlpha().call();
  var lastRewardBlock = await ctx.VDODO.methods._LAST_REWARD_BLOCK_().call();
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
    "stakingPower": info.stakingPower,
    "superiorSP": info.superiorSP,
    "superior": info.superior,
    "credit": info.credit
  }
  console.log(logInfo + " stakingPower:" + fromWei(info.stakingPower, 'ether') + " superiorSP:" + fromWei(info.superiorSP, 'ether') + " superior:" + info.superior + " credit:" + fromWei(info.credit, 'ether'));
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
      await getUserInfo(ctx, dodoTeam, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.mint(
        decimalStr("100"),
        dodoTeam
      ), ctx.sendParam(account0), "mint-fisrt");

      //增加两个区块
      await ctx.mintTestToken(account0, decimalStr("0"));
      await ctx.mintTestToken(account0, decimalStr("0"));

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, dodoTeam, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "1018181818181818181");
      assert.equal(userInfo.stakingPower, "100000000000000000000");
      assert.equal(userInfo.superiorSP, "10000000000000000000");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, dodoTeam);

      assert.equal(superiorInfo.stakingPower, "10000000000000000000");
      assert.equal(superiorInfo.superiorSP, "0");
      assert.equal(superiorInfo.credit, "10000000000000000000");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "99900000000000000000000")
    });

    it("vdodo-mint-second", async () => {
      await mint(ctx, account0, decimalStr("100"), dodoTeam)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, dodoTeam, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.mint(
        decimalStr("100"),
        dodoTeam
      ), ctx.sendParam(account0), "mint-second");

      //增加一个区块
      await ctx.mintTestToken(account0, decimalStr("0"));

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, dodoTeam, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "1013656931303990126");
      assert.equal(userInfo.stakingPower, "199099099099099099188");
      assert.equal(userInfo.superiorSP, "19909909909909909918");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, dodoTeam);

      assert.equal(superiorInfo.stakingPower, "19909909909909909918");
      assert.equal(superiorInfo.superiorSP, "0");
      assert.equal(superiorInfo.credit, "19999999999999999999");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "99800000000000000000000")

    });


    it("vdodo-mint-second-otherSuperior", async () => {
      await mint(ctx, account0, decimalStr("100"), dodoTeam)
      await mint(ctx, account1, decimalStr("100"), dodoTeam)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, dodoTeam, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.mint(
        decimalStr("100"),
        account1
      ), ctx.sendParam(account0), "mint-second");

      //增加一个区块
      await ctx.mintTestToken(account0, decimalStr("0"));

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, dodoTeam, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "1016710114832014192");
      assert.equal(userInfo.stakingPower, "198652706760814869070");
      assert.equal(userInfo.superiorSP, "19865270676081486907");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, dodoTeam);

      assert.equal(superiorInfo.stakingPower, "29775180585991396825");
      assert.equal(superiorInfo.superiorSP, "0");
      assert.equal(superiorInfo.credit, "29999999999999999998");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000")


      assert.equal(dodo_u, "99800000000000000000000")

      let otherInfo = await getUserInfo(ctx, account1, "Superior after")

      assert.equal(otherInfo.stakingPower, "99099099099099099188");
      assert.equal(otherInfo.superiorSP, "9909909909909909918");
      assert.equal(otherInfo.credit, "0");
      assert.equal(otherInfo.superior, dodoTeam)

      assert.equal(dodo_u, "99800000000000000000000")
    });


    it("redeem-amount-read", async () => {
      await mint(ctx, account0, decimalStr("100"), dodoTeam)

      let [dodoReceive, burnDodoAmount, withdrawFeeDodoAmount] = await ctx.VDODO.methods.getWithdrawResult(decimalStr("1")).call();

      assert.equal(dodoReceive, decimalStr("0.85"));
      assert.equal(burnDodoAmount, decimalStr("0"));
      assert.equal(withdrawFeeDodoAmount, decimalStr("0.15"));
    });


    it("redeem-partial-haveMint", async () => {
      await mint(ctx, account0, decimalStr("10000"), dodoTeam)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account0, "User before");
      await getUserInfo(ctx, dodoTeam, "Superior before")
      await dodoBalance(ctx, account0, "before")

      await logGas(await ctx.VDODO.methods.redeem(decimalStr("10"), false), ctx.sendParam(account0), "redeem-partial-haveMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account0, "User after");
      let superiorInfo = await getUserInfo(ctx, dodoTeam, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account0, "after")

      assert.equal(alpha, "1015242271212274241");
      assert.equal(userInfo.stakingPower, "9000090900827197526589");
      assert.equal(userInfo.superiorSP, "900009090082719752659");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, dodoTeam);

      assert.equal(superiorInfo.stakingPower, "900009090082719752659");
      assert.equal(superiorInfo.superiorSP, "0");
      assert.equal(superiorInfo.credit, "900000000000000000001");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "90850000000000000000000")

    });


    it("redeem-partial-NotMint", async () => {
      //多个下级引用
      await mint(ctx, account1, decimalStr("100"), dodoTeam)
      await mint(ctx, account2, decimalStr("100"), dodoTeam)
      await mint(ctx, account3, decimalStr("100"), dodoTeam)
      await mint(ctx, account4, decimalStr("100"), dodoTeam)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, dodoTeam, "User before");
      await getUserInfo(ctx, account3, "One of referer before");
      await dodoBalance(ctx, dodoTeam, "before")

      let dodoTeamVdodoAmount = await ctx.VDODO.methods.balanceOf(dodoTeam).call()

      await logGas(await ctx.VDODO.methods.redeem((dodoTeamVdodoAmount - 3000) + "", false), ctx.sendParam(dodoTeam), "redeem-partial-NotMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, dodoTeam, "User after");
      let superiorInfo = await getUserInfo(ctx, account3, "One of referer after")
      let [, dodo_u] = await dodoBalance(ctx, dodoTeam, "after")

      assert.equal(alpha, "1019099117914144640");
      assert.equal(userInfo.stakingPower, "39343185109576338546");
      assert.equal(userInfo.superiorSP, "0");
      assert.equal(userInfo.credit, "39999999999999999997");
      assert.equal(userInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(superiorInfo.stakingPower, "98652706760814869070");
      assert.equal(superiorInfo.superiorSP, "9865270676081486907");
      assert.equal(superiorInfo.credit, "0");
      assert.equal(superiorInfo.superior, dodoTeam);

      assert.equal(dodo_u, "231818181817926710")
    });


    it("redeem-all-haveMint", async () => {
      //第一笔mint不动，防止totalSupply过小
      await mint(ctx, account0, decimalStr("10000"), dodoTeam)
      await mint(ctx, account1, decimalStr("100"), dodoTeam)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, account1, "User before");
      await getUserInfo(ctx, dodoTeam, "Superior before")
      await dodoBalance(ctx, account1, "before")

      await logGas(await ctx.VDODO.methods.redeem(0, true), ctx.sendParam(account1), "redeem-all-haveMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, account1, "User after");
      let superiorInfo = await getUserInfo(ctx, dodoTeam, "Superior after")
      let [, dodo_u] = await dodoBalance(ctx, account1, "after")

      assert.equal(alpha, "1001544677264954465");
      assert.equal(userInfo.stakingPower, "0");
      assert.equal(userInfo.superiorSP, "0");
      assert.equal(userInfo.credit, "0");
      assert.equal(userInfo.superior, dodoTeam);

      assert.equal(superiorInfo.stakingPower, "1000000000000000000000");
      assert.equal(superiorInfo.superiorSP, "0");
      assert.equal(superiorInfo.credit, "999999099990999910008");
      assert.equal(superiorInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(dodo_u, "985007650076500764931")

    });


    it("redeem-all-NoMint", async () => {
      //多个下级引用
      await mint(ctx, account1, decimalStr("100"), dodoTeam)
      await mint(ctx, account2, decimalStr("100"), dodoTeam)
      await mint(ctx, account3, decimalStr("100"), dodoTeam)
      await mint(ctx, account4, decimalStr("100"), dodoTeam)

      await getGlobalState(ctx, "before");
      await getUserInfo(ctx, dodoTeam, "User before");
      await getUserInfo(ctx, account3, "One of referer before");
      await dodoBalance(ctx, dodoTeam, "before")

      await logGas(await ctx.VDODO.methods.redeem(0, true), ctx.sendParam(dodoTeam), "redeem-all-NotMint");

      let [alpha,] = await getGlobalState(ctx, "after");
      let userInfo = await getUserInfo(ctx, dodoTeam, "User after");
      let superiorInfo = await getUserInfo(ctx, account3, "One of referer after")
      let [, dodo_u] = await dodoBalance(ctx, dodoTeam, "after")

      assert.equal(alpha, "1019130459045726342");
      assert.equal(userInfo.stakingPower, "39253971537899000903");
      assert.equal(userInfo.superiorSP, "0");
      assert.equal(userInfo.credit, "39999999999999999997");
      assert.equal(userInfo.superior, "0x0000000000000000000000000000000000000000");

      assert.equal(superiorInfo.stakingPower, "98652706760814869070");
      assert.equal(superiorInfo.superiorSP, "9865270676081486907");
      assert.equal(superiorInfo.credit, "0");
      assert.equal(superiorInfo.superior, dodoTeam);

      assert.equal(dodo_u, "309090909090909029")
    });
  })
});
