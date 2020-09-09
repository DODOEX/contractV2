/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import * as assert from 'assert';
import BigNumber from 'bignumber.js';
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
      ctx.BASE.options.address,
      WETH.options.address,
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
      .getDODO(ctx.BASE.options.address, WETH.options.address)
      .call()
  );
  await ctx.DODO.methods.enableBaseDeposit().send(ctx.sendParam(ctx.Deployer));
  await ctx.DODO.methods.enableQuoteDeposit().send(ctx.sendParam(ctx.Deployer));
  await ctx.DODO.methods.enableTrading().send(ctx.sendParam(ctx.Deployer));

  ctx.QUOTE = WETH;

  DODOEthProxy = await contracts.newContract(
    contracts.DODO_ETH_PROXY_CONTRACT_NAME,
    [ctx.DODOZoo.options.address, WETH.options.address]
  );

  // env
  lp = ctx.spareAccounts[0];
  trader = ctx.spareAccounts[1];
  await ctx.setOraclePrice(decimalStr("0.01"));
  await ctx.approveDODO(lp);
  await ctx.approveDODO(trader);

  await ctx.BASE.methods
    .mint(lp, decimalStr("1000"))
    .send(ctx.sendParam(ctx.Deployer));
  await ctx.BASE.methods
    .mint(trader, decimalStr("1000"))
    .send(ctx.sendParam(ctx.Deployer));
  await ctx.BASE.methods
    .approve(DODOEthProxy.options.address, MAX_UINT256)
    .send(ctx.sendParam(trader));

  await ctx.DODO.methods
    .depositBase(decimalStr("1000"))
    .send(ctx.sendParam(lp));
}

describe("DODO ETH PROXY", () => {
  let snapshotId: string;
  let ctx: DODOContext;

  before(async () => {
    ctx = await getDODOContext();
    await init(ctx);
    await ctx.BASE.methods
      .approve(DODOEthProxy.options.address, MAX_UINT256)
      .send(ctx.sendParam(trader));
  });

  beforeEach(async () => {
    snapshotId = await ctx.EVM.snapshot();
    let depositAmount = "10";
    await DODOEthProxy.methods
      .depositEthAsQuote(decimalStr(depositAmount), ctx.BASE.options.address)
      .send(ctx.sendParam(lp, depositAmount));
  });

  afterEach(async () => {
    await ctx.EVM.reset(snapshotId);
  });

  describe("buy&sell eth directly", () => {
    it("buy", async () => {
      const maxPayEthAmount = "2.1";
      const ethInPoolBefore = decimalStr("10");
      const traderEthBalanceBefore = await ctx.Web3.eth.getBalance(trader);
      const txReceipt: TransactionReceipt = await logGas(
        DODOEthProxy.methods.buyTokenWithEth(
          ctx.BASE.options.address,
          decimalStr("200"),
          decimalStr(maxPayEthAmount)
        ),
        ctx.sendParam(trader, maxPayEthAmount),
        "buy token with ETH directly"
      );
      const ethInPoolAfter = "12056338203652739553";
      assert.strictEqual(
        await ctx.DODO.methods._QUOTE_BALANCE_().call(),
        ethInPoolAfter
      );
      assert.strictEqual(
        await ctx.BASE.methods.balanceOf(trader).call(),
        decimalStr("1200")
      );
      const tx = await ctx.Web3.eth.getTransaction(txReceipt.transactionHash);
      const ethSpentOnGas = new BigNumber(tx.gasPrice).times(txReceipt.gasUsed);
      const traderEthBalanceAfter = await ctx.Web3.eth.getBalance(trader);

      const totalEthBefore = new BigNumber(traderEthBalanceBefore).plus(
        ethInPoolBefore
      );
      const totalEthAfter = new BigNumber(traderEthBalanceAfter)
        .plus(ethSpentOnGas)
        .plus(ethInPoolAfter);
      assert.ok(totalEthBefore.eq(totalEthAfter));
    });
    it("sell", async () => {
      const minReceiveEthAmount = "0.45";
      await logGas(
        DODOEthProxy.methods.sellTokenToEth(
          ctx.BASE.options.address,
          decimalStr("50"),
          decimalStr(minReceiveEthAmount)
        ),
        ctx.sendParam(trader),
        "sell token to ETH directly"
      );
      assert.strictEqual(
        await ctx.DODO.methods._QUOTE_BALANCE_().call(),
        "9503598324131652490"
      );
      assert.strictEqual(
        await ctx.BASE.methods.balanceOf(trader).call(),
        decimalStr("950")
      );
    });
  });

  describe("withdraw eth directly", () => {
    it("withdraw", async () => {
      const withdrawAmount = decimalStr("5");
      const quoteLpTokenAddress = await ctx.DODO.methods
        ._QUOTE_CAPITAL_TOKEN_()
        .call();
      const quoteLpToken = contracts.getContractWithAddress(
        contracts.TEST_ERC20_CONTRACT_NAME,
        quoteLpTokenAddress
      );
      await quoteLpToken.methods
        .approve(DODOEthProxy.options.address, MAX_UINT256)
        .send(ctx.sendParam(lp));
      const lpEthBalanceBefore = await ctx.Web3.eth.getBalance(lp);
      const txReceipt: TransactionReceipt = await DODOEthProxy.methods
        .withdrawEthAsQuote(withdrawAmount, ctx.BASE.options.address)
        .send(ctx.sendParam(lp));

      assert.strictEqual(
        await ctx.DODO.methods.getLpQuoteBalance(lp).call(),
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
      const quoteLpTokenAddress = await ctx.DODO.methods
        ._QUOTE_CAPITAL_TOKEN_()
        .call();
      const quoteLpToken = contracts.getContractWithAddress(
        contracts.TEST_ERC20_CONTRACT_NAME,
        quoteLpTokenAddress
      );
      await quoteLpToken.methods
        .approve(DODOEthProxy.options.address, MAX_UINT256)
        .send(ctx.sendParam(lp));
      const lpEthBalanceBefore = await ctx.Web3.eth.getBalance(lp);
      const txReceipt: TransactionReceipt = await DODOEthProxy.methods
        .withdrawAllEthAsQuote(ctx.BASE.options.address)
        .send(ctx.sendParam(lp));

      assert.strictEqual(
        await ctx.DODO.methods.getLpQuoteBalance(lp).call(),
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
          .buyTokenWithEth(
            ctx.BASE.options.address,
            decimalStr("50"),
            decimalStr("1")
          )
          .send(ctx.sendParam(trader, "2")),
        /ETH_AMOUNT_NOT_MATCH/
      );
      await assert.rejects(
        DODOEthProxy.methods
          .depositEthAsQuote(decimalStr("1"), ctx.BASE.options.address)
          .send(ctx.sendParam(lp, "2")),
        /ETH_AMOUNT_NOT_MATCH/
      );
    });
  });
});
