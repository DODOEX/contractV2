/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { DODOContext, getDODOContext } from './utils/Context';
import { decimalStr, MAX_UINT256 } from './utils/Converter';
// import * as assert from "assert"
import { newContract, DODO_TOKEN_CONTRACT_NAME, DODO_MINE_NAME, TEST_ERC20_CONTRACT_NAME, getContractWithAddress } from './utils/Contracts';
import { Contract } from 'web3-eth-contract';
import { assert } from 'chai';
import { logGas } from './utils/Log';

let BaseDLP: Contract
let QuoteDLP: Contract
let DODOToken: Contract
let DODOMine: Contract
let lp1: string;
let lp2: string;

async function init(ctx: DODOContext): Promise<void> {

  lp1 = ctx.spareAccounts[0];
  lp2 = ctx.spareAccounts[1];
  await ctx.mintTestToken(lp1, decimalStr("100"), decimalStr("10000"));
  await ctx.mintTestToken(lp2, decimalStr("100"), decimalStr("10000"));

  await ctx.approveDODO(lp1);
  await ctx.approveDODO(lp2);

  await ctx.DODO.methods.depositBase(decimalStr("100")).send(ctx.sendParam(lp1))
  await ctx.DODO.methods.depositQuote(decimalStr("10000")).send(ctx.sendParam(lp1))

  await ctx.DODO.methods.depositBase(decimalStr("100")).send(ctx.sendParam(lp2))
  await ctx.DODO.methods.depositQuote(decimalStr("10000")).send(ctx.sendParam(lp2))

  DODOToken = await newContract(DODO_TOKEN_CONTRACT_NAME)
  DODOMine = await newContract(DODO_MINE_NAME, [DODOToken.options.address, (await ctx.Web3.eth.getBlockNumber()).toString()])

  BaseDLP = await getContractWithAddress(TEST_ERC20_CONTRACT_NAME, await ctx.DODO.methods._BASE_CAPITAL_TOKEN_().call())
  QuoteDLP = await getContractWithAddress(TEST_ERC20_CONTRACT_NAME, await ctx.DODO.methods._QUOTE_CAPITAL_TOKEN_().call())

  await BaseDLP.methods.approve(DODOMine.options.address, MAX_UINT256).send(ctx.sendParam(lp1))
  await QuoteDLP.methods.approve(DODOMine.options.address, MAX_UINT256).send(ctx.sendParam(lp1))

  await BaseDLP.methods.approve(DODOMine.options.address, MAX_UINT256).send(ctx.sendParam(lp2))
  await QuoteDLP.methods.approve(DODOMine.options.address, MAX_UINT256).send(ctx.sendParam(lp2))

  await DODOMine.methods.setReward(decimalStr("100")).send(ctx.sendParam(ctx.Deployer))
  await DODOMine.methods.addLpToken(BaseDLP.options.address, "1", true).send(ctx.sendParam(ctx.Deployer))
  await DODOMine.methods.addLpToken(QuoteDLP.options.address, "2", true).send(ctx.sendParam(ctx.Deployer))
  await DODOToken.methods.transfer(DODOMine.options.address, decimalStr("100000000")).send(ctx.sendParam(ctx.Deployer))
}

describe("Lock DODO Token", () => {

  let snapshotId: string
  let ctx: DODOContext

  before(async () => {
    ctx = await getDODOContext()
    await init(ctx);
  })

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId)
  });

  describe("Lp Deposit", () => {
    it.only("single lp deposit", async () => {
      await logGas(DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")), ctx.sendParam(lp1), "deposit")
      await ctx.EVM.fastMove(100)
      assert.equal(await DODOMine.methods.getPendingReward(BaseDLP.options.address, lp1).call(), "3333333333333333333300")
      assert.equal(await DODOMine.methods.getDlpMiningSpeed(BaseDLP.options.address).call(), "33333333333333333333")
    })

    it("multi lp deposit", async () => {
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp1))
      await ctx.EVM.fastMove(100)
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp2))
      await ctx.EVM.fastMove(100)
      assert.equal(await DODOMine.methods.getPendingReward(BaseDLP.options.address, lp1).call(), "5033333333333333333200")
      assert.equal(await DODOMine.methods.getPendingReward(BaseDLP.options.address, lp2).call(), "1666666666666666666600")

      await DODOMine.methods.deposit(QuoteDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp1))
      await ctx.EVM.fastMove(100)
      await DODOMine.methods.deposit(QuoteDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp2))
      await ctx.EVM.fastMove(100)
      assert.equal(await DODOMine.methods.getPendingReward(QuoteDLP.options.address, lp1).call(), "10066666666666666666600")
      assert.equal(await DODOMine.methods.getPendingReward(QuoteDLP.options.address, lp2).call(), "3333333333333333333300")

      assert.equal(await DODOMine.methods.getAllPendingReward(lp1).call(), "18466666666666666666500")
      assert.equal(await DODOMine.methods.getAllPendingReward(lp2).call(), "8366666666666666666600")
    })

    it("lp multi deposit and withdraw", async () => {
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp2))
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp1))
      await ctx.EVM.fastMove(100)
      await logGas(DODOMine.methods.withdraw(BaseDLP.options.address, decimalStr("50")), ctx.sendParam(lp1), "withdraw")
      assert.equal(await DODOMine.methods.getAllPendingReward(lp1).call(), "0")
      assert.equal(await DODOToken.methods.balanceOf(lp1).call(), "1683333333333333333300")
      assert.equal(await DODOMine.methods.getRealizedReward(lp1).call(), "1683333333333333333300")
      await ctx.EVM.fastMove(100)
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("50")).send(ctx.sendParam(lp1))
      assert.equal(await DODOMine.methods.getAllPendingReward(lp1).call(), "0")
      assert.equal(await DODOToken.methods.balanceOf(lp1).call(), "2805555555555555555500")
      assert.equal(await DODOMine.methods.getRealizedReward(lp1).call(), "2805555555555555555500")
    })

    it("lp claim", async () => {
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp1))
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp2))

      await DODOMine.methods.deposit(QuoteDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp1))
      await DODOMine.methods.deposit(QuoteDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp2))

      await ctx.EVM.fastMove(100)

      await logGas(DODOMine.methods.claim(BaseDLP.options.address), ctx.sendParam(lp1), "claim")
      assert.equal(await DODOMine.methods.getPendingReward(BaseDLP.options.address, lp1).call(), "0")
      assert.equal(await DODOMine.methods.getAllPendingReward(lp1).call(), "3433333333333333333200")
      assert.equal(await DODOMine.methods.getRealizedReward(lp1).call(), "1749999999999999999900")
      assert.equal(await DODOToken.methods.balanceOf(lp1).call(), "1749999999999999999900")

      await logGas(DODOMine.methods.claimAll(), ctx.sendParam(lp2), "claim 2 pool")
      assert.equal(await DODOMine.methods.getPendingReward(BaseDLP.options.address, lp2).call(), "0")
      assert.equal(await DODOMine.methods.getAllPendingReward(lp2).call(), "0")
      assert.equal(await DODOMine.methods.getRealizedReward(lp2).call(), "5133333333333333333200")
      assert.equal(await DODOToken.methods.balanceOf(lp2).call(), "5133333333333333333200")
    })

    it("lp emergency withdraw", async () => {
      await DODOMine.methods.deposit(QuoteDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp1))

      await ctx.EVM.fastMove(100)

      await DODOMine.methods.emergencyWithdraw(QuoteDLP.options.address).send(ctx.sendParam(lp1))

      assert.equal(await QuoteDLP.methods.balanceOf(lp1).call(), decimalStr("10000"))
      assert.equal(await DODOMine.methods.getPendingReward(QuoteDLP.options.address, lp1).call(), "0")
      assert.equal(await DODOMine.methods.getAllPendingReward(lp1).call(), "0")
      assert.equal(await DODOMine.methods.getRealizedReward(lp1).call(), "0")
      assert.equal(await DODOToken.methods.balanceOf(lp1).call(), "0")
    })

    it("setLpToken", async () => {
      await DODOMine.methods.deposit(BaseDLP.options.address, decimalStr("100")).send(ctx.sendParam(lp1))
      await ctx.EVM.fastMove(100)
      await DODOMine.methods.setLpToken(BaseDLP.options.address, "2", true).send(ctx.sendParam(ctx.Deployer))
      await ctx.EVM.fastMove(100)

      assert.equal(await DODOMine.methods.getAllPendingReward(lp1).call(), "8366666666666666666600")
    })

  })

})