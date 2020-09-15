/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import * as assert from 'assert';
import { Contract } from 'web3-eth-contract';

import { DODOContext, getDODOContext } from './utils/Context';
import {
  newContract,
  UNISWAP_ARBITRAGEUR_CONTRACT_NAME,
  UNISWAP_CONTRACT_NAME,
} from './utils/Contracts';
import { decimalStr } from './utils/Converter';
import { logGas } from './utils/Log';

let lp: string;
let keeper: string;

let Uniswap: Contract;
let UniswapArbitrageur: Contract;

let UniswapReverse: Contract;
let UniswapArbitrageurReverse: Contract;

async function init(ctx: DODOContext): Promise<void> {
  await ctx.setOraclePrice(decimalStr("100"));

  lp = ctx.spareAccounts[0];
  keeper = ctx.spareAccounts[1];
  await ctx.approveDODO(lp);

  await ctx.mintTestToken(lp, decimalStr("100"), decimalStr("10000"));

  await ctx.DODO.methods.depositBase(decimalStr("10")).send(ctx.sendParam(lp));
  await ctx.DODO.methods
    .depositQuote(decimalStr("1000"))
    .send(ctx.sendParam(lp));

  Uniswap = await newContract(UNISWAP_CONTRACT_NAME);
  Uniswap.methods
    .initialize(ctx.BASE.options.address, ctx.QUOTE.options.address)
    .send(ctx.sendParam(ctx.Deployer));
  ctx.BASE.methods
    .transfer(Uniswap.options.address, decimalStr("10"))
    .send(ctx.sendParam(lp));
  ctx.QUOTE.methods
    .transfer(Uniswap.options.address, decimalStr("2000"))
    .send(ctx.sendParam(lp));
  Uniswap.methods.sync().send(ctx.sendParam(lp));

  UniswapArbitrageur = await newContract(UNISWAP_ARBITRAGEUR_CONTRACT_NAME, [
    Uniswap.options.address,
    ctx.DODO.options.address,
  ]);

  UniswapReverse = await newContract(UNISWAP_CONTRACT_NAME);
  UniswapReverse.methods
    .initialize(ctx.BASE.options.address, ctx.QUOTE.options.address)
    .send(ctx.sendParam(ctx.Deployer));
  ctx.BASE.methods
    .transfer(UniswapReverse.options.address, decimalStr("10"))
    .send(ctx.sendParam(lp));
  ctx.QUOTE.methods
    .transfer(UniswapReverse.options.address, decimalStr("2000"))
    .send(ctx.sendParam(lp));
  UniswapReverse.methods.sync().send(ctx.sendParam(lp));

  UniswapArbitrageurReverse = await newContract(
    UNISWAP_ARBITRAGEUR_CONTRACT_NAME,
    [UniswapReverse.options.address, ctx.DODO.options.address]
  );
}

describe("Uniswap Arbitrageur", () => {
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

  describe("arbitrage with not reverse pair", () => {
    it("buy at dodo", async () => {
      await ctx.setOraclePrice(decimalStr("100"));
      // dodo price 100 uniswap price 200
      // buy at dodo
      await logGas(
        UniswapArbitrageur.methods.executeBuyArbitrage(decimalStr("1")),
        ctx.sendParam(keeper),
        "arbitrage buy at dodo not reverse"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(keeper).call(),
        "79836384956601695518"
      );
    });

    it("sell at dodo", async () => {
      await ctx.setOraclePrice(decimalStr("300"));
      // dodo price 300 uniswap price 200
      // sell at dodo
      await logGas(
        UniswapArbitrageur.methods.executeSellArbitrage(decimalStr("1")),
        ctx.sendParam(keeper),
        "arbitrage sell at dodo not reverse"
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(keeper).call(),
        "252761069524143743"
      );
    });
  });

  describe("arbitrage with reverse pair", () => {
    it("buy at dodo", async () => {
      await ctx.setOraclePrice(decimalStr("100"));
      // dodo price 100 uniswap price 200
      // buy at dodo
      await logGas(
        UniswapArbitrageurReverse.methods.executeBuyArbitrage(decimalStr("1")),
        ctx.sendParam(keeper),
        "arbitrage buy at dodo reverse"
      );
      assert.equal(
        await ctx.QUOTE.methods.balanceOf(keeper).call(),
        "79836384956601695518"
      );
    });

    it("sell at dodo", async () => {
      await ctx.setOraclePrice(decimalStr("300"));
      // dodo price 300 uniswap price 200
      // sell at dodo
      await logGas(
        UniswapArbitrageurReverse.methods.executeSellArbitrage(decimalStr("1")),
        ctx.sendParam(keeper),
        "arbitrage sell at dodo reverse"
      );
      assert.equal(
        await ctx.BASE.methods.balanceOf(keeper).call(),
        "252761069524143743"
      );
    });
  });

  describe("revert cases", () => {
    it("price not match", async () => {
      await ctx.setOraclePrice(decimalStr("200"));
      await assert.rejects(
        UniswapArbitrageurReverse.methods
          .executeBuyArbitrage(decimalStr("1"))
          .send(ctx.sendParam(keeper)),
        /NOT_PROFITABLE/
      );
      await assert.rejects(
        UniswapArbitrageurReverse.methods
          .executeSellArbitrage(decimalStr("1"))
          .send(ctx.sendParam(keeper)),
        /NOT_PROFITABLE/
      );
    });
  });
});
