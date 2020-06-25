/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { DODOContext, getDODOContext, DefaultDODOContextInitConfig } from './utils/Context';
import * as contracts from "./utils/Contracts";
import * as assert from "assert"
import { decimalStr, MAX_UINT256 } from './utils/Converter';
import { Contract } from "web3-eth-contract";

let lp: string
let trader: string
let DODOEthProxy: Contract

async function init(ctx: DODOContext): Promise<void> {
  // switch ctx to eth proxy mode
  let WETH = await contracts.newContract(contracts.WETH_CONTRACT_NAME)
  await ctx.DODOZoo.methods.breedDODO(
    ctx.Supervisor,
    ctx.Maintainer,
    WETH.options.address,
    ctx.QUOTE.options.address,
    ctx.ORACLE.options.address,
    DefaultDODOContextInitConfig.lpFeeRate,
    DefaultDODOContextInitConfig.mtFeeRate,
    DefaultDODOContextInitConfig.k,
    DefaultDODOContextInitConfig.gasPriceLimit
  ).send(ctx.sendParam(ctx.Deployer))

  ctx.DODO = await contracts.getContractWithAddress(contracts.DODO_CONTRACT_NAME, await ctx.DODOZoo.methods.getDODO(WETH.options.address, ctx.QUOTE.options.address).call())

  ctx.BASE = WETH
  ctx.BaseCapital = await contracts.getContractWithAddress(contracts.DODO_LP_TOKEN_CONTRACT_NAME, await ctx.DODO.methods._BASE_CAPITAL_TOKEN_().call())

  DODOEthProxy = await contracts.newContract(contracts.DODO_ETH_PROXY_CONTRACT_NAME, [ctx.DODOZoo.options.address, WETH.options.address])


  // env
  lp = ctx.spareAccounts[0]
  trader = ctx.spareAccounts[1]
  await ctx.setOraclePrice(decimalStr("100"))
  await ctx.approveDODO(lp)
  await ctx.approveDODO(trader)

  await ctx.QUOTE.methods.mint(lp, decimalStr("1000")).send(ctx.sendParam(ctx.Deployer))
  await ctx.QUOTE.methods.mint(trader, decimalStr("1000")).send(ctx.sendParam(ctx.Deployer))
  await ctx.QUOTE.methods.approve(DODOEthProxy.options.address, MAX_UINT256).send(ctx.sendParam(trader))

  await ctx.DODO.methods.depositQuote(decimalStr("1000")).send(ctx.sendParam(lp))
}

describe("DODO ETH PROXY", () => {

  let snapshotId: string
  let ctx: DODOContext

  before(async () => {
    ctx = await getDODOContext()
    await init(ctx)
    await ctx.QUOTE.methods.approve(DODOEthProxy.options.address, MAX_UINT256).send(ctx.sendParam(trader))
  })

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
    let depositAmount = "10"
    await DODOEthProxy.methods.depositEth(decimalStr(depositAmount), ctx.QUOTE.options.address).send(ctx.sendParam(lp, depositAmount))
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId)
  });

  describe("buy&sell eth directly", () => {
    it("buy", async () => {
      let buyAmount = "1"
      await DODOEthProxy.methods.buyEthWith(ctx.QUOTE.options.address, decimalStr(buyAmount), decimalStr("200")).send(ctx.sendParam(trader))
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("8.999"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "898581839502056240973")
      ctx.Web3
    })
    it("sell", async () => {
      let sellAmount = "1"
      await DODOEthProxy.methods.sellEthTo(ctx.QUOTE.options.address, decimalStr(sellAmount), decimalStr("50")).send(ctx.sendParam(trader, sellAmount))
      assert.equal(await ctx.DODO.methods._BASE_BALANCE_().call(), decimalStr("11"))
      assert.equal(await ctx.QUOTE.methods.balanceOf(trader).call(), "1098617454226610630664")
    })
  })

  describe("revert cases", () => {
    it("value not match", async () => {
      await assert.rejects(
        DODOEthProxy.methods.sellEthTo(ctx.QUOTE.options.address, decimalStr("1"), decimalStr("50")).send(ctx.sendParam(trader, "2")),
        /ETH_AMOUNT_NOT_MATCH/
      )
      await assert.rejects(
        DODOEthProxy.methods.depositEth(decimalStr("1"), ctx.QUOTE.options.address).send(ctx.sendParam(lp, "2")),
        /ETH_AMOUNT_NOT_MATCH/
      )
    })
  })
})