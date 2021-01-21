/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, gweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';
import { EXTERNAL_VALUE_NAME, getContractWithAddress } from '../utils/Contracts';
const truffleAssert = require('truffle-assertions');

let lp: string;
let trader: string;

async function init(ctx: DVMContext): Promise<void> {
  lp = ctx.SpareAccounts[0];
  trader = ctx.SpareAccounts[1];

  // await ctx.mintTestToken(lp, decimalStr("10"), decimalStr("1000"));
  // await ctx.mintTestToken(trader, decimalStr("10"), decimalStr("1000"));

  // await ctx.transferBaseToDVM(lp, decimalStr("10"))
  // await ctx.DVM.methods.buyShares(lp).send(ctx.sendParam(lp))
}

describe("FeeratemodelUpdate", () => {
  let snapshotId: string;
  let ctx: DVMContext;

  before(async () => {
    ctx = await getDVMContext();
    await init(ctx);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("Feeratemodel", () => {

    it("feeRateUpdate", async () => {
      var feeRate = await ctx.DVM.methods.getUserFeeRate(lp).call()
      console.log(feeRate[1])//1000000000000000
      assert.equal(
        feeRate[1],
        "1000000000000000"
      );

      console.log('~~~~~~~~~~~~~~~~~start set new feerate~~~~~~~~~~~~~~~~~')
      var feerateLogicAddress = ctx.MtFeeRateModelLogic.options.address;

      await ctx.mtFeeRateModel.methods.setFeeRate(decimalStr("0.003"),feerateLogicAddress).send(ctx.sendParam(ctx.Deployer))
      var feeRateSet = await ctx.DVM.methods.getUserFeeRate(lp).call()
      console.log(feeRateSet[1])
      assert.equal(
        feeRateSet[1],
        "3000000000000000"
      );
      console.log('~~~~~~~~~~~~~~~~~start update feerateModel~~~~~~~~~~~~~~~~~')
      //no updatefile.sol found
      // var feerateLogicUpdateAddress = ctx.MtFeeRateModelLogicUpdate.options.address;
      // await ctx.mtFeeRateModel.methods.setFeeRate(decimalStr("0.001"),feerateLogicUpdateAddress).send(ctx.sendParam(ctx.Deployer))
      // var feeRateUpdate = await ctx.DVM.methods.getUserFeeRate(lp).call()
      // console.log(feeRateUpdate[1])
      // assert.equal(
      //   feeRateUpdate[1],
      //   "4000000000000000"
      // );
      // console.log('~~~~~~~~~~~~~~~~~set feeMapping[trader] ==0 ~~~~~~~~~~~~~~~~~')
      // await ctx.mtFeeRateModel.methods.setSpecificFeeRate(trader,decimalStr("0.001"),feerateLogicUpdateAddress).send(ctx.sendParam(ctx.Deployer))
      // var feeRateTrader = await ctx.DVM.methods.getUserFeeRate(trader).call()
      // console.log(feeRateTrader[1])
      // assert.equal(// if(feeMapping[trader] == 0) return _FEE_RATE_;
      //   feeRateUpdate[1],
      //   "4000000000000000"
      // );


    })
  });
});