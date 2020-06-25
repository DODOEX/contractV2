/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { DODOContext, getDODOContext } from './utils/Context';
import * as assert from "assert"
import { newContract, TEST_ERC20_CONTRACT_NAME, getContractWithAddress, DODO_CONTRACT_NAME } from './utils/Contracts';


async function init(ctx: DODOContext): Promise<void> { }

describe("DODO ZOO", () => {

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

  describe("Breed new dodo", () => {
    it("could not deploy the same dodo", async () => {
      await assert.rejects(
        ctx.DODOZoo.methods.breedDODO(ctx.Supervisor, ctx.Maintainer, ctx.BASE.options.address, ctx.QUOTE.options.address, ctx.ORACLE.options.address, "0", "0", "1", "0").send(ctx.sendParam(ctx.Deployer)),
        /DODO_IS_REGISTERED/
      )

      await assert.rejects(
        ctx.DODOZoo.methods.breedDODO(ctx.Supervisor, ctx.Maintainer, ctx.QUOTE.options.address, ctx.BASE.options.address, ctx.ORACLE.options.address, "0", "0", "1", "0").send(ctx.sendParam(ctx.Deployer)),
        /DODO_IS_REGISTERED/
      )
    })

    it("breed new dodo", async () => {
      let newBase = await newContract(TEST_ERC20_CONTRACT_NAME)
      let newQuote = await newContract(TEST_ERC20_CONTRACT_NAME)
      await assert.rejects(
        ctx.DODOZoo.methods.breedDODO(ctx.Supervisor, ctx.Maintainer, newBase.options.address, newQuote.options.address, ctx.ORACLE.options.address, "0", "0", "1", "0").send(ctx.sendParam(ctx.Maintainer)),
        /NOT_OWNER/
      )
      await ctx.DODOZoo.methods.breedDODO(ctx.Supervisor, ctx.Maintainer, newBase.options.address, newQuote.options.address, ctx.ORACLE.options.address, "0", "0", "1", "0").send(ctx.sendParam(ctx.Deployer))

      let newDODO = getContractWithAddress(DODO_CONTRACT_NAME, await ctx.DODOZoo.methods.getDODO(newBase.options.address, newQuote.options.address).call())
      assert.equal(await newDODO.methods._BASE_TOKEN_().call(), newBase.options.address)
      assert.equal(await newDODO.methods._QUOTE_TOKEN_().call(), newQuote.options.address)

      // could not init twice
      await assert.rejects(
        newDODO.methods.init(ctx.Supervisor, ctx.Maintainer, ctx.QUOTE.options.address, ctx.BASE.options.address, ctx.ORACLE.options.address, "0", "0", "1", "0").send(ctx.sendParam(ctx.Deployer)),
        /DODO_ALREADY_INITIALIZED/
      )
    })


  })
})