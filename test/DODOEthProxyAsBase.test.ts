/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import * as assert from 'assert';
import { BigNumber } from 'bignumber.js';
import { TransactionReceipt } from 'web3-core';
import { Contract } from 'web3-eth-contract';

import {
  DefaultDODOContextInitConfig,
  DODOContext,
  getDODOContext,
} from './utils/Context';
import * as contracts from './utils/Contracts';
import { decimalStr, MAX_UINT256 } from './utils/Converter';
import { logGas } from './utils/Log';

let lp: string;
let trader: string;
let DODOEthProxy: Contract;

async function init(ctx: DODOContext): Promise<void> {
  // switch ctx to eth proxy mode
  const WETH = await contracts.newContract(contracts.WETH_CONTRACT_NAME);
  await ctx.DODOZoo.methods
    .breedDODO(
      ctx.Maintainer,
      WETH.options.address,
      ctx.QUOTE.options.address,
      ctx.ORACLE.options.address,
      DefaultDODOContextInitConfig.lpFeeRate,
      DefaultDODOContextInitConfig.mtFeeRate,
      DefaultDODOContextInitConfig.k,
      DefaultDODOContextInitConfig.gasPriceLimit
    )
    .send(ctx.sendParam(ctx.Deployer));

  ctx.DODO = contracts.getContractWithAddress(
    contracts.DODO_CONTRACT_NAME,
    await ctx.DODOZoo.methods
      .getDODO(WETH.options.address, ctx.QUOTE.options.address)
      .call()
  );
  await ctx.DODO.methods.enableBaseDeposit().send(ctx.sendParam(ctx.Deployer));
  await ctx.DODO.methods.enableQuoteDeposit().send(ctx.sendParam(ctx.Deployer));
  await ctx.DODO.methods.enableTrading().send(ctx.sendParam(ctx.Deployer));

  ctx.BASE = WETH;

  DODOEthProxy = await contracts.newContract(
    contracts.DODO_ETH_PROXY_CONTRACT_NAME,
    [ctx.DODOZoo.options.address, WETH.options.address]
  );

  // env
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];
  await ctx.setOraclePrice(decimalStr("100"));
  await ctx.approveDODO(lp);
  await ctx.approveDODO(trader);

  await ctx.QUOTE.methods
    .mint(lp, decimalStr("1000"))
    .send(ctx.sendParam(ctx.Deployer));
  await ctx.QUOTE.methods
    .mint(trader, decimalStr("1000"))
    .send(ctx.sendParam(ctx.Deployer));
  await ctx.QUOTE.methods
    .approve(DODOEthProxy.options.address, MAX_UINT256)
    .send(ctx.sendParam(trader));

  await ctx.DODO.methods
    .depositQuote(decimalStr("1000"))
    .send(ctx.sendParam(lp));
}

describe("DODO ETH PROXY", () => {
  let snapshotId: string;
  let ctx: DODOContext;

  before(async () => {
    ctx = await getDODOContext();
    await init(ctx);
    await ctx.QUOTE.methods
      .approve(DODOEthProxy.options.address, MAX_UINT256)
      .send(ctx.sendParam(trader));
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
    const depositAmount = "10";
    await DODOEthProxy.methods
      .depositEthAsBase(decimalStr(depositAmount), ctx.QUOTE.options.address)
      .send(ctx.sendParam(lp, depositAmount));
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("buy&sell eth directly", () => {
    it("buy", async () => {
      const buyAmount = "1";
      await logGas(
        DODOEthProxy.methods.buyEthWithToken(
          ctx.QUOTE.options.address,
          decimalStr(buyAmount),
          decimalStr("200")
        ),
        ctx.sendParam(trader),
        "buy ETH with token directly"
      );
      assert.strictEqual(
        await ctx.DODO.methods._BASE_BALANCE_().call(),
        decimalStr("8.999")
      );
      assert.strictEqual(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "898581839502056240973"
      );
    });
    it("sell", async () => {
      const sellAmount = "1";
      await logGas(
        DODOEthProxy.methods.sellEthToToken(
          ctx.QUOTE.options.address,
          decimalStr(sellAmount),
          decimalStr("50")
        ),
        ctx.sendParam(trader, sellAmount),
        "sell ETH to token directly"
      );
      assert.strictEqual(
        await ctx.DODO.methods._BASE_BALANCE_().call(),
        decimalStr("11")
      );
      assert.strictEqual(
        await ctx.QUOTE.methods.balanceOf(trader).call(),
        "1098617454226610630663"
      );
    });
  });

  describe("withdraw eth directly", () => {
    it("withdraw", async () => {
      const withdrawAmount = decimalStr("5");
      const baseLpTokenAddress = await ctx.DODO.methods
        ._BASE_CAPITAL_TOKEN_()
        .call();
      const baseLpToken = contracts.getContractWithAddress(
        contracts.TEST_ERC20_CONTRACT_NAME,
        baseLpTokenAddress
      );
      await baseLpToken.methods
        .approve(DODOEthProxy.options.address, MAX_UINT256)
        .send(ctx.sendParam(lp));
      const lpEthBalanceBefore = await ctx.Web3.eth.getBalance(lp);
      const txReceipt: TransactionReceipt = await DODOEthProxy.methods
        .withdrawEthAsBase(withdrawAmount, ctx.QUOTE.options.address)
        .send(ctx.sendParam(lp));

      assert.strictEqual(
        await ctx.DODO.methods.getLpBaseBalance(lp).call(),
        withdrawAmount
      );
      const tx = await ctx.Web3.eth.getTransaction(txReceipt.transactionHash);
      const ethSpentOnGas = new BigNumber(tx.gasPrice).times(txReceipt.gasUsed);
      const lpEthBalanceAfter = await ctx.Web3.eth.getBalance(lp);
      assert.ok(
        new BigNumber(lpEthBalanceBefore)
          .plus(withdrawAmount)
          .minus(ethSpentOnGas)
          .eq(lpEthBalanceAfter)
      );
    });

    it("withdraw all", async () => {
      const withdrawAmount = decimalStr("10");
      const baseLpTokenAddress = await ctx.DODO.methods
        ._BASE_CAPITAL_TOKEN_()
        .call();
      const baseLpToken = contracts.getContractWithAddress(
        contracts.TEST_ERC20_CONTRACT_NAME,
        baseLpTokenAddress
      );
      await baseLpToken.methods
        .approve(DODOEthProxy.options.address, MAX_UINT256)
        .send(ctx.sendParam(lp));
      const lpEthBalanceBefore = await ctx.Web3.eth.getBalance(lp);
      const txReceipt: TransactionReceipt = await DODOEthProxy.methods
        .withdrawAllEthAsBase(ctx.QUOTE.options.address)
        .send(ctx.sendParam(lp));

      assert.strictEqual(
        await ctx.DODO.methods.getLpBaseBalance(lp).call(),
        "0"
      );
      const tx = await ctx.Web3.eth.getTransaction(txReceipt.transactionHash);
      const ethSpentOnGas = new BigNumber(tx.gasPrice).times(txReceipt.gasUsed);
      const lpEthBalanceAfter = await ctx.Web3.eth.getBalance(lp);
      assert.ok(
        new BigNumber(lpEthBalanceBefore)
          .plus(withdrawAmount)
          .minus(ethSpentOnGas)
          .eq(lpEthBalanceAfter)
      );
    });
  });

  describe("revert cases", () => {
    it("value not match", async () => {
      await assert.rejects(
        DODOEthProxy.methods
          .sellEthToToken(
            ctx.QUOTE.options.address,
            decimalStr("1"),
            decimalStr("50")
          )
          .send(ctx.sendParam(trader, "2")),
        /ETH_AMOUNT_NOT_MATCH/
      );
      await assert.rejects(
        DODOEthProxy.methods
          .depositEthAsBase(decimalStr("1"), ctx.QUOTE.options.address)
          .send(ctx.sendParam(lp, "2")),
        /ETH_AMOUNT_NOT_MATCH/
      );
    });
  });
});
