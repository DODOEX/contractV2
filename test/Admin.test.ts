/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import * as assert from 'assert';

import { DODOContext, getDODOContext } from './utils/Context';
import { decimalStr } from './utils/Converter';

let lp1: string;
let lp2: string;
let trader: string;
let tempAccount: string;

async function init(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(decimalStr("100"));
  tempAccount = ctx.spareAccounts[5];
  lp1 = ctx.spareAccounts[0];
  lp2 = ctx.spareAccounts[1];
  trader = ctx.spareAccounts[2];
  await ctx.mintTestToken(lp1, decimalStr("100"), decimalStr("10000"));
  await ctx.mintTestToken(lp2, decimalStr("100"), decimalStr("10000"));
  await ctx.mintTestToken(trader, decimalStr("100"), decimalStr("10000"));
  await ctx.approveDODO(lp1);
  await ctx.approveDODO(lp2);
  await ctx.approveDODO(trader);
}

describe("Admin", () => {
  let snapshotId: string;
  let ctx: DODOContext;

  before(async () => {
    ctx = await getDODOContext();
    await init(ctx);
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("Settings", () => {
    it("set oracle", async () => {
      await ctx.DODO.methods
        .setOracle(tempAccount)
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(await ctx.DODO.methods._ORACLE_().call(), tempAccount);
    });

    it("set suprevisor", async () => {
      await ctx.DODO.methods
        .setSupervisor(tempAccount)
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(await ctx.DODO.methods._SUPERVISOR_().call(), tempAccount);
    });

    it("set maintainer", async () => {
      await ctx.DODO.methods
        .setMaintainer(tempAccount)
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(await ctx.DODO.methods._MAINTAINER_().call(), tempAccount);
    });

    it("set liquidity provider fee rate", async () => {
      await ctx.DODO.methods
        .setLiquidityProviderFeeRate(decimalStr("0.01"))
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(
        await ctx.DODO.methods._LP_FEE_RATE_().call(),
        decimalStr("0.01")
      );
    });

    it("set maintainer fee rate", async () => {
      await ctx.DODO.methods
        .setMaintainerFeeRate(decimalStr("0.01"))
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(
        await ctx.DODO.methods._MT_FEE_RATE_().call(),
        decimalStr("0.01")
      );
    });

    it("set k", async () => {
      await ctx.DODO.methods
        .setK(decimalStr("0.2"))
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(await ctx.DODO.methods._K_().call(), decimalStr("0.2"));
    });

    it("set gas price limit", async () => {
      await ctx.DODO.methods
        .setGasPriceLimit(decimalStr("100"))
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(
        await ctx.DODO.methods._GAS_PRICE_LIMIT_().call(),
        decimalStr("100")
      );
    });
  });

  describe("Controls", () => {
    it("control flow", async () => {
      await ctx.DODO.methods
        .disableBaseDeposit()
        .send(ctx.sendParam(ctx.Supervisor));
      await assert.rejects(
        ctx.DODO.methods.depositBase(decimalStr("10")).send(ctx.sendParam(lp1)),
        /DEPOSIT_BASE_NOT_ALLOWED/
      );

      await ctx.DODO.methods
        .enableBaseDeposit()
        .send(ctx.sendParam(ctx.Deployer));
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(),
        decimalStr("10")
      );

      await ctx.DODO.methods
        .disableQuoteDeposit()
        .send(ctx.sendParam(ctx.Supervisor));
      await assert.rejects(
        ctx.DODO.methods
          .depositQuote(decimalStr("1000"))
          .send(ctx.sendParam(lp1)),
        /DEPOSIT_QUOTE_NOT_ALLOWED/
      );

      await ctx.DODO.methods
        .enableQuoteDeposit()
        .send(ctx.sendParam(ctx.Deployer));
      await ctx.DODO.methods
        .depositQuote(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(),
        decimalStr("10")
      );

      await ctx.DODO.methods
        .disableTrading()
        .send(ctx.sendParam(ctx.Supervisor));
      await assert.rejects(
        ctx.DODO.methods
          .buyBaseToken(decimalStr("1"), decimalStr("200"), "0x")
          .send(ctx.sendParam(trader)),
        /TRADE_NOT_ALLOWED/
      );

      await ctx.DODO.methods.enableTrading().send(ctx.sendParam(ctx.Deployer));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("1"), decimalStr("200"), "0x")
        .send(ctx.sendParam(trader));
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        decimalStr("101")
      );
    });

    it("control flow premission", async () => {
      await assert.rejects(
        ctx.DODO.methods.setGasPriceLimit("1").send(ctx.sendParam(trader)),
        /NOT_SUPERVISOR_OR_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.disableTrading().send(ctx.sendParam(trader)),
        /NOT_SUPERVISOR_OR_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.disableQuoteDeposit().send(ctx.sendParam(trader)),
        /NOT_SUPERVISOR_OR_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.disableBaseDeposit().send(ctx.sendParam(trader)),
        /NOT_SUPERVISOR_OR_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.disableBuying().send(ctx.sendParam(trader)),
        /NOT_SUPERVISOR_OR_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.disableSelling().send(ctx.sendParam(trader)),
        /NOT_SUPERVISOR_OR_OWNER/
      );

      await assert.rejects(
        ctx.DODO.methods.setOracle(trader).send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.setSupervisor(trader).send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.setMaintainer(trader).send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods
          .setLiquidityProviderFeeRate(decimalStr("0.1"))
          .send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods
          .setMaintainerFeeRate(decimalStr("0.1"))
          .send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.setK(decimalStr("0.1")).send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );

      await assert.rejects(
        ctx.DODO.methods.enableTrading().send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.enableQuoteDeposit().send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.enableBaseDeposit().send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.enableBuying().send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.enableSelling().send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods
          .setBaseBalanceLimit(decimalStr("0"))
          .send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods
          .setQuoteBalanceLimit(decimalStr("0"))
          .send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods.enableTrading().send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
    });

    it("advanced controls", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("10"))
        .send(ctx.sendParam(lp1));

      await ctx.DODO.methods
        .disableBuying()
        .send(ctx.sendParam(ctx.Supervisor));
      await assert.rejects(
        ctx.DODO.methods
          .buyBaseToken(decimalStr("1"), decimalStr("200"), "0x")
          .send(ctx.sendParam(trader)),
        /BUYING_NOT_ALLOWED/
      );
      await ctx.DODO.methods.enableBuying().send(ctx.sendParam(ctx.Deployer));

      await ctx.DODO.methods
        .disableSelling()
        .send(ctx.sendParam(ctx.Supervisor));
      await assert.rejects(
        ctx.DODO.methods
          .sellBaseToken(decimalStr("1"), decimalStr("200"), "0x")
          .send(ctx.sendParam(trader)),
        /SELLING_NOT_ALLOWED/
      );
      await ctx.DODO.methods.enableSelling().send(ctx.sendParam(ctx.Deployer));

      await ctx.DODO.methods
        .setBaseBalanceLimit(decimalStr("0"))
        .send(ctx.sendParam(ctx.Deployer));
      await assert.rejects(
        ctx.DODO.methods
          .depositBase(decimalStr("1000"))
          .send(ctx.sendParam(lp1)),
        /BASE_BALANCE_LIMIT_EXCEEDED/
      );

      await ctx.DODO.methods
        .setQuoteBalanceLimit(decimalStr("0"))
        .send(ctx.sendParam(ctx.Deployer));
      await assert.rejects(
        ctx.DODO.methods
          .depositQuote(decimalStr("1000"))
          .send(ctx.sendParam(lp1)),
        /QUOTE_BALANCE_LIMIT_EXCEEDED/
      );
    });
  });

  describe("Final settlement", () => {
    it("final settlement when R is ONE", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));

      await ctx.DODO.methods
        .finalSettlement()
        .send(ctx.sendParam(ctx.Deployer));

      await ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp1));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("100")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        decimalStr("10000")
      );
    });

    it("final settlement when R is ABOVE ONE", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));

      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .finalSettlement()
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "0");

      await ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp1));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("94.995")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        "10551951805416248746110"
      );
    });

    it("final settlement when R is BELOW ONE", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));

      await ctx.DODO.methods
        .sellBaseToken(decimalStr("5"), decimalStr("100"), "0x")
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .finalSettlement()
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "0");

      await ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp1));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("105")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        "9540265973590798352835"
      );
    });

    it("final settlement when only deposit base", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));

      await ctx.DODO.methods
        .finalSettlement()
        .send(ctx.sendParam(ctx.Deployer));

      await ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp1));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("100")
      );
    });

    it("final settlement when only deposit quote", async () => {
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));

      await ctx.DODO.methods
        .finalSettlement()
        .send(ctx.sendParam(ctx.Deployer));

      await ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp1));

      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        decimalStr("10000")
      );
    });

    it("final settlement revert cases", async () => {
      await assert.rejects(
        ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp1)),
        /DODO_NOT_CLOSED/
      );
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("500"))
        .send(ctx.sendParam(lp2));

      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .finalSettlement()
        .send(ctx.sendParam(ctx.Deployer));
      await assert.rejects(
        ctx.DODO.methods.finalSettlement().send(ctx.sendParam(ctx.Deployer)),
        /DODO_CLOSED/
      );

      await assert.rejects(
        ctx.DODO.methods.withdrawAllBase().send(ctx.sendParam(lp1)),
        /DODO_CLOSED/
      )
      await assert.rejects(
        ctx.DODO.methods.withdrawAllQuote().send(ctx.sendParam(lp1)),
        /DODO_CLOSED/
      )

      await ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp2));
      await assert.rejects(
        ctx.DODO.methods.claimAssets().send(ctx.sendParam(lp2)),
        /ALREADY_CLAIMED/
      );

      await assert.rejects(
        ctx.DODO.methods.enableQuoteDeposit().send(ctx.sendParam(ctx.Deployer)),
        /DODO_CLOSED/
      );
      await assert.rejects(
        ctx.DODO.methods.enableBaseDeposit().send(ctx.sendParam(ctx.Deployer)),
        /DODO_CLOSED/
      );
      await assert.rejects(
        ctx.DODO.methods.enableTrading().send(ctx.sendParam(ctx.Deployer)),
        /DODO_CLOSED/
      );
      await assert.rejects(
        ctx.DODO.methods.enableBuying().send(ctx.sendParam(ctx.Deployer)),
        /DODO_CLOSED/
      );
      await assert.rejects(
        ctx.DODO.methods.enableSelling().send(ctx.sendParam(ctx.Deployer)),
        /DODO_CLOSED/
      );
    });
  });

  describe("donate", () => {
    it("donate quote & base token", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositBase(decimalStr("20"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("2000"))
        .send(ctx.sendParam(lp2));

      await ctx.DODO.methods
        .donateBaseToken(decimalStr("2"))
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .donateQuoteToken(decimalStr("500"))
        .send(ctx.sendParam(trader));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "10666666666666666666"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        "1166666666666666666666"
      );
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp2).call(),
        "21333333333333333333"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp2).call(),
        "2333333333333333333333"
      );

      await ctx.DODO.methods.withdrawAllBase().send(ctx.sendParam(lp1));
      await ctx.DODO.methods.withdrawAllBase().send(ctx.sendParam(lp2));

      await ctx.DODO.methods.withdrawAllQuote().send(ctx.sendParam(lp1));
      await ctx.DODO.methods.withdrawAllQuote().send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        "100666666666666666666"
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(lp2).call(),
        "101333333333333333334"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        "10166666666666666666666"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp2).call(),
        "10333333333333333333334"
      );
    });
  });

  describe("retrieve", () => {
    it("retrieve base token", async () => {
      await ctx.BASE.methods
        .transfer(ctx.DODO.options.address, decimalStr("1"))
        .send(ctx.sendParam(trader));
      await assert.rejects(
        ctx.DODO.methods
          .retrieve(ctx.BASE.options.address, decimalStr("1"))
          .send(ctx.sendParam(trader)),
        /NOT_OWNER/
      );
      await assert.rejects(
        ctx.DODO.methods
          .retrieve(ctx.BASE.options.address, decimalStr("2"))
          .send(ctx.sendParam(ctx.Deployer)),
        /DODO_BASE_BALANCE_NOT_ENOUGH/
      );
      await ctx.DODO.methods
        .retrieve(ctx.BASE.options.address, decimalStr("1"))
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Deployer).call(),
        decimalStr("1")
      );
    });

    it("retrieve quote token", async () => {
      await ctx.QUOTE.methods
        .transfer(ctx.DODO.options.address, decimalStr("1"))
        .send(ctx.sendParam(trader));
      await assert.rejects(
        ctx.DODO.methods
          .retrieve(ctx.QUOTE.options.address, decimalStr("2"))
          .send(ctx.sendParam(ctx.Deployer)),
        /DODO_QUOTE_BALANCE_NOT_ENOUGH/
      );
      await ctx.DODO.methods
        .retrieve(ctx.QUOTE.options.address, decimalStr("1"))
        .send(ctx.sendParam(ctx.Deployer));
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Deployer).call(),
        decimalStr("1")
      );
    });
  });

  describe("revert cases", () => {
    it("k revert cases", async () => {
      await assert.rejects(
        ctx.DODO.methods
          .setK(decimalStr("1"))
          .send(ctx.sendParam(ctx.Deployer)),
        /K>=1/
      );
      await assert.rejects(
        ctx.DODO.methods
          .setK(decimalStr("0"))
          .send(ctx.sendParam(ctx.Deployer)),
        /K=0/
      );
    });

    it("fee revert cases", async () => {
      await assert.rejects(
        ctx.DODO.methods
          .setLiquidityProviderFeeRate(decimalStr("0.999"))
          .send(ctx.sendParam(ctx.Deployer)),
        /FEE_RATE>=1/
      );
      await assert.rejects(
        ctx.DODO.methods
          .setMaintainerFeeRate(decimalStr("0.998"))
          .send(ctx.sendParam(ctx.Deployer)),
        /FEE_RATE>=1/
      );
    });
  });
});
