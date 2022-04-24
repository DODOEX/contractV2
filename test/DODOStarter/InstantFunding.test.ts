/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, MAX_UINT256 } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DODOStarterContext, DODOStarterContextInitConfig} from '../utils/DODOStarterContext';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import BigNumber from 'bignumber.js';
import { StringLiteralLike } from 'typescript';
const truffleAssert = require('truffle-assertions');

let maker: string;
let user1: string;
let user2: string;
let sellTokenAddress: string;
let fundTokenAddress: string;
let config: DODOStarterContextInitConfig = {
    // time config
    bidDuration: new BigNumber(86400),
    calmDuration: new BigNumber(86400),
    tokenVestingDuration: new BigNumber(86400),
    fundVestingDuration: new BigNumber(86400),
    lpVestingDuration: new BigNumber(86400),
    // value config
    lowerPrice: decimalStr("1"),
    upperPrice: decimalStr("5"),
    tokenCliffRate: decimalStr("1"),
    fundCliffRate: decimalStr("1"),
    lpCliffRate: decimalStr("1"),
    initialLiquidity: decimalStr("1"),
}

async function init(ctx: DODOStarterContext): Promise<void> {
    maker = ctx.SpareAccounts[0];
    user1 = ctx.SpareAccounts[1];
    user2 = ctx.SpareAccounts[2];
    sellTokenAddress = ctx.SellToken.options.address;
    fundTokenAddress = ctx.FundToken.options.address;
}

describe("InstantFunding", () => {
    let snapshotId: string;
    let ctx: DODOStarterContext;

    before(async () => {
        ctx = new DODOStarterContext();
        await ctx.init(config);
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("Basic Info", () => {
        it("get the correct start price", async () => {
            assert.equal(await ctx.InstantFunding.methods._START_PRICE_().call(), decimalStr("10"));
        });

        it("get the correct end price", async () => {
            assert.equal(await ctx.InstantFunding.methods._END_PRICE_().call(), decimalStr("1"));
        });

        it("check if deposit is open", async () => {
            assert.equal(await ctx.InstantFunding.methods.isDepositOpen().call(), true)
            await ctx.EVM.increaseTime(86400 + 1)
            assert.equal(await ctx.InstantFunding.methods.isDepositOpen().call(), false)
        });

        it("check if funding is end", async () => {
            assert.equal(await ctx.InstantFunding.methods.isFundingEnd().call(), false)
            await ctx.EVM.increaseTime(86400 + 1)
            assert.equal(await ctx.InstantFunding.methods.isFundingEnd().call(), true)
        });
    });

    describe("Deposit Funds", () => {
        it("successfully deposit funds", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.InstantFunding.options.address, decimalStr("3")).send(ctx.sendParam(user1));
            var tx = await logGas(ctx.InstantFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");
            var account = tx.events['DepositFund'].returnValues['account'];
            var fundAmount = tx.events['DepositFund'].returnValues['fundAmount'];
            var allocationAmount = tx.events['DepositFund'].returnValues['allocationAmount'];
            let currentPrice = await ctx.InstantFunding.methods.getCurrentPrice().call();
            assert.equal(account, user1);
            assert.equal(fundAmount, decimalStr("3"));
            assert.equal(allocationAmount, decimalStr(new BigNumber(decimalStr("3")).div(currentPrice).toString()))
        })

        it("revert if the deposit is not open", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.InstantFunding.options.address, 3).send(ctx.sendParam(user1));
            await ctx.EVM.increaseTime(86400);
            await truffleAssert.reverts(ctx.InstantFunding.methods.depositFunds(user1).send(ctx.sendParam(user1)), "DEPOSIT_NOT_OPEN")
        })
    });

    describe("Claim Token", () => {
        it("successfully claim token", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.InstantFunding.options.address, decimalStr("3")).send(ctx.sendParam(user1));
            await logGas(ctx.InstantFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");
            let currentPrice = await ctx.InstantFunding.methods.getCurrentPrice().call();

            await ctx.EVM.increaseTime(86400 * 2)

            var tx = await logGas(ctx.InstantFunding.methods.claimToken(user1), ctx.sendParam(user1), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user1);
            assert.equal(tokenAmount, decimalStr(new BigNumber(decimalStr("3")).div(currentPrice).toString()));
        })
    });

    describe("Integration", () => {
        it("user1 deposit 8000, user2 deposit 5000", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("8000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.InstantFunding.options.address, decimalStr("8000")).send(ctx.sendParam(user1));
            await logGas(ctx.InstantFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");
            let currentPrice1 = await ctx.InstantFunding.methods.getCurrentPrice().call();
            await ctx.FundToken.methods.mint(user2, decimalStr("5000")).send(ctx.sendParam(user2));
            await ctx.FundToken.methods.transfer(ctx.InstantFunding.options.address, decimalStr("5000")).send(ctx.sendParam(user2));
            await logGas(ctx.InstantFunding.methods.depositFunds(user2), ctx.sendParam(user2), "depositFunds");
            let currentPrice2 = await ctx.InstantFunding.methods.getCurrentPrice().call();

            await ctx.EVM.increaseTime(86400 * 2)

            var tx = await logGas(ctx.InstantFunding.methods.claimToken(user1), ctx.sendParam(user1), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            let expectTokenAmount1 = decimalStr(new BigNumber(decimalStr("8000")).div(currentPrice1).toString()) 
            assert.equal(to, user1);
            assert.equal(tokenAmount, expectTokenAmount1);
            assert.equal(await ctx.SellToken.methods.balanceOf(user1).call(), expectTokenAmount1);

            var tx = await logGas(ctx.InstantFunding.methods.claimToken(user2), ctx.sendParam(user2), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            let expectTokenAmount2 = decimalStr(new BigNumber(decimalStr("5000")).div(currentPrice1).toString()) 
            assert.equal(to, user2);
            assert.equal(tokenAmount, expectTokenAmount2);
            assert.equal(await ctx.SellToken.methods.balanceOf(user2).call(), expectTokenAmount2);
        })
    });
});

