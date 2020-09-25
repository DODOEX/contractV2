/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { DODOContext, getDODOContext } from './utils/Context';
import { decimalStr, MAX_UINT256 } from './utils/Converter';
// import * as assert from "assert"
import { newContract, DODO_TOKEN_CONTRACT_NAME, LOCKED_TOKEN_VAULT_CONTRACT_NAME } from './utils/Contracts';
import { Contract } from 'web3-eth-contract';
import * as assert from 'assert';
import BigNumber from 'bignumber.js';
import { logGas } from './utils/Log';

let DODOToken: Contract
let LockedTokenVault: Contract
let initTime: any

let u1: string
let u2: string
let u3: string

async function init(ctx: DODOContext): Promise<void> {
  u1 = ctx.spareAccounts[0];
  u2 = ctx.spareAccounts[1];
  u3 = ctx.spareAccounts[2];

  initTime = (await ctx.Web3.eth.getBlock(await ctx.Web3.eth.getBlockNumber())).timestamp;
  DODOToken = await newContract(DODO_TOKEN_CONTRACT_NAME)

  // release after 1 day, cliff 10% and vest in 1 day
  LockedTokenVault = await newContract(LOCKED_TOKEN_VAULT_CONTRACT_NAME, [DODOToken.options.address, initTime + 86400, 86400, decimalStr("0.1")])

  DODOToken.methods.approve(LockedTokenVault.options.address, MAX_UINT256).send(ctx.sendParam(ctx.Deployer))
  LockedTokenVault.methods.deposit(decimalStr("10000")).send(ctx.sendParam(ctx.Deployer))
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

  describe("Lock operations", () => {
    it("init states", async () => {
      assert.equal(await LockedTokenVault.methods._UNDISTRIBUTED_AMOUNT_().call(), decimalStr("10000"))
      await logGas(LockedTokenVault.methods.grant(
        [u1],
        [decimalStr("100")]
      ), ctx.sendParam(ctx.Deployer), "grant 1 address")
    })

    it("grant", async () => {
      await logGas(LockedTokenVault.methods.grant(
        [u1, u2, u3],
        [decimalStr("100"), decimalStr("200"), decimalStr("300")]
      ), ctx.sendParam(ctx.Deployer), "grant 3 address")

      assert.equal(await LockedTokenVault.methods._UNDISTRIBUTED_AMOUNT_().call(), decimalStr("9400"))

      assert.equal(await LockedTokenVault.methods.getOriginBalance(u1).call(), decimalStr("100"))
      assert.equal(await LockedTokenVault.methods.getOriginBalance(u2).call(), decimalStr("200"))
      assert.equal(await LockedTokenVault.methods.getClaimableBalance(u1).call(), "0")

      await ctx.EVM.increaseTime(86400)
      assert.ok(approxEqual(await LockedTokenVault.methods.getClaimableBalance(u1).call(), decimalStr("10")))

      await ctx.EVM.increaseTime(30000)
      assert.ok(approxEqual(await LockedTokenVault.methods.getClaimableBalance(u1).call(), decimalStr("41.25")))
    })

    it("claim", async () => {
      await LockedTokenVault.methods.grant(
        [u1, u2, u3],
        [decimalStr("100"), decimalStr("200"), decimalStr("300")]
      ).send(ctx.sendParam(ctx.Deployer))

      await ctx.EVM.increaseTime(86400)
      await LockedTokenVault.methods.claim().send(ctx.sendParam(u1))
      assert.equal(await LockedTokenVault.methods.getOriginBalance(u1).call(), decimalStr("100"))
      assert.equal(await LockedTokenVault.methods.getClaimableBalance(u1).call(), "0")
      assert.ok(approxEqual(await DODOToken.methods.balanceOf(u1).call(), decimalStr("10")))

      await ctx.EVM.increaseTime(30000)
      await LockedTokenVault.methods.claim().send(ctx.sendParam(u1))
      assert.equal(await LockedTokenVault.methods.getClaimableBalance(u1).call(), "0")
      assert.ok(approxEqual(await LockedTokenVault.methods.getRemainingBalance(u1).call(), decimalStr("58.75")))
      assert.ok(approxEqual(await DODOToken.methods.balanceOf(u1).call(), decimalStr("41.25")))

      await LockedTokenVault.methods.claim().send(ctx.sendParam(u2))
      assert.equal(await LockedTokenVault.methods.getClaimableBalance(u2).call(), "0")
      assert.ok(approxEqual(await LockedTokenVault.methods.getRemainingBalance(u2).call(), decimalStr("117.5")))
      assert.ok(approxEqual(await DODOToken.methods.balanceOf(u2).call(), decimalStr("82.5")))
    })

    it("recall & transfer", async () => {
      await LockedTokenVault.methods.grant(
        [u1, u2, u3],
        [decimalStr("100"), decimalStr("200"), decimalStr("300")]
      ).send(ctx.sendParam(ctx.Deployer))

      // recall u2
      await LockedTokenVault.methods.recall(u2).send(ctx.sendParam(ctx.Deployer))
      assert.equal(await LockedTokenVault.methods.getOriginBalance(u2).call(), "0")

      // transfer from u3 to u2
      await ctx.EVM.increaseTime(86400 + 30000)
      await LockedTokenVault.methods.transferLockedToken(u2).send(ctx.sendParam(u3))

      await LockedTokenVault.methods.claim().send(ctx.sendParam(u2))
      assert.equal(await LockedTokenVault.methods.getClaimableBalance(u2).call(), "0")
      assert.ok(approxEqual(await LockedTokenVault.methods.getRemainingBalance(u2).call(), decimalStr("176.25")))
      assert.ok(approxEqual(await DODOToken.methods.balanceOf(u2).call(), decimalStr("123.75")))

      // transfer from u2 to u3
      await ctx.EVM.increaseTime(30000)
      await LockedTokenVault.methods.transferLockedToken(u3).send(ctx.sendParam(u2))

      await LockedTokenVault.methods.claim().send(ctx.sendParam(u3))
      assert.equal(await LockedTokenVault.methods.getClaimableBalance(u3).call(), "0")
      assert.ok(approxEqual(await LockedTokenVault.methods.getRemainingBalance(u3).call(), decimalStr("82.5")))
      assert.ok(approxEqual(await DODOToken.methods.balanceOf(u3).call(), decimalStr("93.75")))

      // transfer from u3 to u1
      await LockedTokenVault.methods.transferLockedToken(u1).send(ctx.sendParam(u3))

    })

    it("withdraw", async () => {
      await LockedTokenVault.methods.grant(
        [u1, u2, u3],
        [decimalStr("100"), decimalStr("200"), decimalStr("300")]
      ).send(ctx.sendParam(ctx.Deployer))

      await LockedTokenVault.methods.withdraw(decimalStr("1000")).send(ctx.sendParam(ctx.Deployer))
      assert.equal(await LockedTokenVault.methods._UNDISTRIBUTED_AMOUNT_().call(), decimalStr("8400"))

      await assert.rejects(
        LockedTokenVault.methods.withdraw(decimalStr("8500")).send(ctx.sendParam(ctx.Deployer)),
        /SUB_ERROR/
      )
    })

    it("finish distributed", async () => {
      await LockedTokenVault.methods.grant(
        [u1, u2, u3],
        [decimalStr("100"), decimalStr("200"), decimalStr("300")]
      ).send(ctx.sendParam(ctx.Deployer))
      await LockedTokenVault.methods.finishDistribute().send(ctx.sendParam(ctx.Deployer))

      // can not recall
      await assert.rejects(
        LockedTokenVault.methods.recall(u2).send(ctx.sendParam(ctx.Deployer)),
        /DISTRIBUTE FINISHED/
      )
    })
  })

})

function approxEqual(numStr1: string, numStr2: string) {
  let num1 = new BigNumber(numStr1)
  let num2 = new BigNumber(numStr2)
  let ratio = num1.div(num2).minus(1).abs()
  if (ratio.isLessThan(0.0002)) {
    return true
  } else {
    return false
  }
}