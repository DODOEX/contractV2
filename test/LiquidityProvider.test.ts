/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import * as assert from 'assert';

import { DODOContext, getDODOContext } from './utils/Context';
import { decimalStr } from './utils/Converter';
import { logGas } from './utils/Log';

let lp1: string;
let lp2: string;
let trader: string;

async function init(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(decimalStr("100"));
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

describe("LiquidityProvider", () => {
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

  describe("R equals to ONE", () => {
    it("multi lp deposit & withdraw", async () => {
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("0")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("0")
      );

      await logGas(
        ctx.DODO.methods.depositBase(decimalStr("10")),
        ctx.sendParam(lp1),
        "deposit base"
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("90")
      );
      await logGas(
        ctx.DODO.methods.depositQuote(decimalStr("1000")),
        ctx.sendParam(lp1),
        "deposit quote"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        decimalStr("9000")
      );

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.DODO.methods._BASE_BALANCE_().call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("1000")
      );
      assert.equal(
        await ctx.DODO.methods._QUOTE_BALANCE_().call(),
        decimalStr("1000")
      );

      await ctx.DODO.methods
        .depositBase(decimalStr("3"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .depositQuote(decimalStr("70"))
        .send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("1000")
      );
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp2).call(),
        decimalStr("3")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp2).call(),
        decimalStr("70")
      );
      assert.equal(
        await ctx.DODO.methods._BASE_BALANCE_().call(),
        decimalStr("13")
      );
      assert.equal(
        await ctx.DODO.methods._QUOTE_BALANCE_().call(),
        decimalStr("1070")
      );

      await ctx.DODO.methods
        .withdrawBase(decimalStr("5"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("5")
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("95")
      );
      await ctx.DODO.methods
        .withdrawQuote(decimalStr("100"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("900")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        decimalStr("9100")
      );

      await ctx.DODO.methods.withdrawAllBase().send(ctx.sendParam(lp1));
      assert.equal(await ctx.DODO.methods.getLpBaseBalance(lp1).call(), "0");
      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("100")
      );
      await ctx.DODO.methods.withdrawAllQuote().send(ctx.sendParam(lp1));
      assert.equal(await ctx.DODO.methods.getLpQuoteBalance(lp1).call(), "0");
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        decimalStr("10000")
      );
    });
  });

  describe("R is ABOVE ONE", () => {
    it("deposit", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "10010841132009222923"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("1000")
      );

      await ctx.DODO.methods
        .depositBase(decimalStr("5"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .depositQuote(decimalStr("100"))
        .send(ctx.sendParam(lp2));

      // lp1 & lp2 would both have profit because the curve becomes flatter
      // but the withdraw penalty is greater than this free profit
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "10163234422929069723"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("1000")
      );

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp2).call(),
        "5076114129127759292"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp2).call(),
        decimalStr("100")
      );

      assert.equal(
        await ctx.DODO.methods.getWithdrawBasePenalty(decimalStr("5")).call(),
        "228507420047606093"
      );
      assert.equal(
        await ctx.DODO.methods
          .getWithdrawQuotePenalty(decimalStr("100"))
          .call(),
        "0"
      );
    });

    it("withdraw", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(
        await ctx.DODO.methods.getWithdrawBasePenalty(decimalStr("4")).call(),
        "1065045389392391665"
      );
      assert.equal(
        await ctx.DODO.methods
          .getWithdrawQuotePenalty(decimalStr("100"))
          .call(),
        "0"
      );

      await ctx.DODO.methods
        .withdrawBase(decimalStr("4"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        "92934954610607608335"
      );
      assert.equal(
        await ctx.DODO.methods._BASE_BALANCE_().call(),
        "2060045389392391665"
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(),
        "7075045389392391665"
      );

      await ctx.DODO.methods
        .withdrawQuote(decimalStr("100"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        decimalStr("9100")
      );
      assert.equal(
        await ctx.DODO.methods._QUOTE_BALANCE_().call(),
        "1451951805416248746119"
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(),
        decimalStr("900")
      );
    });
  });

  describe("R is BELOW ONE", () => {
    it("deposit", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("5"), decimalStr("200"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        "1000978629616255276996"
      );

      await ctx.DODO.methods
        .depositQuote(decimalStr("500"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .depositBase(decimalStr("5"))
        .send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        "1012529270910521756641"
      );

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp2).call(),
        decimalStr("5")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp2).call(),
        "505769674273013522654"
      );

      assert.equal(
        await ctx.DODO.methods.getWithdrawBasePenalty(decimalStr("5")).call(),
        "0"
      );
      assert.equal(
        await ctx.DODO.methods
          .getWithdrawQuotePenalty(decimalStr("500"))
          .call(),
        "17320315567280002300"
      );
    });

    it("withdraw", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("5"), decimalStr("200"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(
        await ctx.DODO.methods.getWithdrawBasePenalty(decimalStr("4")).call(),
        "0"
      );
      assert.equal(
        await ctx.DODO.methods
          .getWithdrawQuotePenalty(decimalStr("100"))
          .call(),
        "7389428846238900753"
      );

      await ctx.DODO.methods
        .withdrawQuote(decimalStr("100"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        "9092610571153761099247"
      );
      assert.equal(
        await ctx.DODO.methods._QUOTE_BALANCE_().call(),
        "447655402437037253588"
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(),
        "908310739520405637520"
      );

      await ctx.DODO.methods
        .withdrawBase(decimalStr("4"))
        .send(ctx.sendParam(lp1));
      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("94")
      );
      assert.equal(
        await ctx.DODO.methods._BASE_BALANCE_().call(),
        decimalStr("11")
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(),
        decimalStr("6")
      );
    });
  });

  describe("Oracle changes", () => {
    it("base side lp don't has pnl when R is BELOW ONE", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("5"), decimalStr("200"), "0x")
        .send(ctx.sendParam(trader));

      await ctx.setOraclePrice(decimalStr("80"));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        "914362409397559037208"
      );

      await ctx.setOraclePrice(decimalStr("120"));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        decimalStr("10")
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        "1085284653936129406317"
      );
    });

    it("quote side lp don't has pnl when R is ABOVE ONE", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("600"), "0x")
        .send(ctx.sendParam(trader));

      await ctx.setOraclePrice(decimalStr("80"));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "11138732839027528597"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("1000")
      );

      await ctx.setOraclePrice(decimalStr("120"));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "9234731968726215588"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        decimalStr("1000")
      );
    });
  });

  describe("Transfer lp token", () => {
    it("transfer", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));

      await ctx.BaseCapital.methods
        .transfer(lp2, decimalStr("5"))
        .send(ctx.sendParam(lp1));
      await ctx.QuoteCapital.methods
        .transfer(lp2, decimalStr("5"))
        .send(ctx.sendParam(lp1));

      await ctx.DODO.methods.withdrawAllBase().send(ctx.sendParam(lp2));
      await ctx.DODO.methods.withdrawAllQuote().send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp2).call(),
        decimalStr("105")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp2).call(),
        decimalStr("10005")
      );
    });
  });

  describe("Deposit & transfer to other account", () => {
    it("base token", async () => {
      await ctx.DODO.methods
        .depositBaseTo(lp2, decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .withdrawBaseTo(trader, decimalStr("5"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .withdrawAllBaseTo(ctx.Supervisor)
        .send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp1).call(),
        decimalStr("90")
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(lp2).call(),
        decimalStr("100")
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(trader).call(),
        decimalStr("105")
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(ctx.Supervisor).call(),
        decimalStr("5")
      );
    });

    it("quote token", async () => {
      await ctx.DODO.methods
        .depositQuoteTo(lp2, decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .withdrawQuoteTo(trader, decimalStr("500"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .withdrawAllQuoteTo(ctx.Supervisor)
        .send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp1).call(),
        decimalStr("9000")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(lp2).call(),
        decimalStr("10000")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        decimalStr("10500")
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(ctx.Supervisor).call(),
        decimalStr("500")
      );
    });
  });

  describe("Corner cases", () => {
    it("single side deposit", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .sellBaseToken("5015841132009222923", decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "0");
      assert.equal(
        await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(),
        "10010841132009222923"
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(),
        "1103903610832497492"
      );

      await ctx.DODO.methods.depositQuote("1").send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.DODO.methods.getQuoteCapitalBalanceOf(lp2).call(),
        "1103903610832497493"
      );
    });

    it("single side deposit & lp deposit when R isn't equal to ONE", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));

      await ctx.DODO.methods.depositQuote("1").send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.DODO.methods.getQuoteCapitalBalanceOf(lp2).call(),
        "1"
      );
      assert.equal(await ctx.DODO.methods.getLpQuoteBalance(lp2).call(), "1");
    });

    it("single side deposit (base) & oracle change introduces loss", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));

      await ctx.setOraclePrice(decimalStr("120"));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("4"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("1"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "2");
      assert.equal(
        await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(),
        "9234731968726215603"
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(),
        "1105993618321025490"
      );

      await ctx.DODO.methods.depositQuote("1").send(ctx.sendParam(lp2));
      assert.equal(
        await ctx.DODO.methods.getQuoteCapitalBalanceOf(lp2).call(),
        "7221653398290521828"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp2).call(),
        "7221653398290521884"
      );
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "9234731968726215603"
      );
    });

    it("single side deposit (base) & oracle change introduces profit", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));

      await ctx.setOraclePrice(decimalStr("80"));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("4"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("4"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "2");
      assert.equal(
        await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(),
        "11138732839027528584"
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(),
        "1105408308382702868"
      );

      await ctx.DODO.methods.depositQuote("1").send(ctx.sendParam(lp2));
      assert.equal(
        await ctx.DODO.methods.getQuoteCapitalBalanceOf(lp2).call(),
        "21553269260529319669"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp2).call(),
        "21553269260529319697"
      );
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "11138732839027528584"
      );
    });

    it("single side deposit (quote) & oracle change introduces loss", async () => {
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("5"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));

      await ctx.setOraclePrice(decimalStr("80"));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("4"), decimalStr("600"), "0x")
        .send(ctx.sendParam(trader));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("0.99"), decimalStr("500"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(await ctx.DODO.methods._R_STATUS_().call(), "1");
      assert.equal(
        await ctx.DODO.methods._TARGET_BASE_TOKEN_AMOUNT_().call(),
        "9980000000000000"
      );
      assert.equal(
        await ctx.DODO.methods._TARGET_QUOTE_TOKEN_AMOUNT_().call(),
        "914362409397559035414"
      );

      await ctx.DODO.methods.depositBase("1").send(ctx.sendParam(lp2));
      assert.equal(
        await ctx.DODO.methods.getBaseCapitalBalanceOf(lp2).call(),
        "10247647352975730"
      );
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp2).call(),
        "10247647352975730"
      );
      assert.equal(
        await ctx.DODO.methods.getLpQuoteBalance(lp1).call(),
        "914362409397559035414"
      );
    });

    it("deposit and withdraw immediately", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "10010841132009222923"
      );

      await ctx.DODO.methods
        .depositBase(decimalStr("5"))
        .send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "10163234422929069723"
      );
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp2).call(),
        "5076114129127759292"
      );

      await ctx.DODO.methods.withdrawAllBase().send(ctx.sendParam(lp2));

      assert.equal(
        await ctx.BASE.methods.balanceOf(lp2).call(),
        "99841132414635941792"
      );
      assert.equal(
        await ctx.DODO.methods.getLpBaseBalance(lp1).call(),
        "10182702153814588648"
      );
    });
  });

  describe("Revert cases", () => {
    it("withdraw base amount exceeds DODO balance", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("5"), decimalStr("1000"), "0x")
        .send(ctx.sendParam(trader));

      await assert.rejects(
        ctx.DODO.methods.withdrawBase(decimalStr("6")).send(ctx.sendParam(lp1)),
        /DODO_BASE_BALANCE_NOT_ENOUGH/
      );

      await assert.rejects(
        ctx.DODO.methods.withdrawAllBase().send(ctx.sendParam(lp1)),
        /DODO_BASE_BALANCE_NOT_ENOUGH/
      );
    });

    it("withdraw quote amount exceeds DODO balance", async () => {
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("5"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));

      await assert.rejects(
        ctx.DODO.methods
          .withdrawQuote(decimalStr("600"))
          .send(ctx.sendParam(lp1)),
        /DODO_QUOTE_BALANCE_NOT_ENOUGH/
      );

      await assert.rejects(
        ctx.DODO.methods.withdrawAllQuote().send(ctx.sendParam(lp1)),
        /DODO_QUOTE_BALANCE_NOT_ENOUGH/
      );
    });

    it("withdraw base could not afford penalty", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("9"), decimalStr("10000"), "0x")
        .send(ctx.sendParam(trader));

      await assert.rejects(
        ctx.DODO.methods
          .withdrawBase(decimalStr("0.5"))
          .send(ctx.sendParam(lp1)),
        /PENALTY_EXCEED/
      );

      await assert.rejects(
        ctx.DODO.methods.getWithdrawBasePenalty(decimalStr("10")).call(),
        /DODO_BASE_BALANCE_NOT_ENOUGH/
      );
    });

    it("withdraw quote could not afford penalty", async () => {
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("10"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));

      await assert.rejects(
        ctx.DODO.methods
          .withdrawQuote(decimalStr("200"))
          .send(ctx.sendParam(lp1)),
        /PENALTY_EXCEED/
      );

      await assert.rejects(
        ctx.DODO.methods.getWithdrawQuotePenalty(decimalStr("1000")).call(),
        /DODO_QUOTE_BALANCE_NOT_ENOUGH/
      );
    });

    it("withdraw all base could not afford penalty", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("9.5"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositBase(decimalStr("0.5"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .buyBaseToken(decimalStr("9"), decimalStr("10000"), "0x")
        .send(ctx.sendParam(trader));

      await assert.rejects(
        ctx.DODO.methods
          .withdrawBase(decimalStr("0.5"))
          .send(ctx.sendParam(lp2)),
        /PENALTY_EXCEED/
      );
    });

    it("withdraw all quote could not afford penalty", async () => {
      await ctx.DODO.methods
        .depositQuote(decimalStr("800"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("200"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .sellBaseToken(decimalStr("10"), decimalStr("0"), "0x")
        .send(ctx.sendParam(trader));

      await assert.rejects(
        ctx.DODO.methods
          .withdrawQuote(decimalStr("200"))
          .send(ctx.sendParam(lp2)),
        /PENALTY_EXCEED/
      );
    });

    it("withdraw amount exceeds lp balance", async () => {
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositBase(decimalStr("10"))
        .send(ctx.sendParam(lp2));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp1));
      await ctx.DODO.methods
        .depositQuote(decimalStr("1000"))
        .send(ctx.sendParam(lp2));
      await assert.rejects(
        ctx.DODO.methods
          .withdrawBase(decimalStr("11"))
          .send(ctx.sendParam(lp1)),
        /LP_BASE_CAPITAL_BALANCE_NOT_ENOUGH/
      );
      await assert.rejects(
        ctx.DODO.methods
          .withdrawQuote(decimalStr("1100"))
          .send(ctx.sendParam(lp1)),
        /LP_QUOTE_CAPITAL_BALANCE_NOT_ENOUGH/
      );
    });

    it("withdraw when there is no lp", async () => {
      await assert.rejects(
        ctx.DODO.methods.withdrawBase(decimalStr("1")).send(ctx.sendParam(lp1)),
        /NO_BASE_LP/
      );
      await assert.rejects(
        ctx.DODO.methods
          .withdrawQuote(decimalStr("1"))
          .send(ctx.sendParam(lp1)),
        /NO_QUOTE_LP/
      );
    });
  });
});
