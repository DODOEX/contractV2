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

describe("FairFunding", () => {
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
        it("get the correct cooling duration", async () => {
            assert.equal(await ctx.FairFunding.methods._COOLING_DURATION_().call(), 86400);
        });

        it("get the correct lower limit price", async () => {
            assert.equal(await ctx.FairFunding.methods._LOWER_LIMIT_PRICE_().call(), decimalStr("1"));
        });

        it("get the correct upper limit price", async () => {
            assert.equal(await ctx.FairFunding.methods._UPPER_LIMIT_PRICE_().call(), decimalStr("5"));
        });

        it("get the correct _IS_OVERCAP_STOP", async () => {
            assert.equal(await ctx.FairFunding.methods._IS_OVERCAP_STOP().call(), true);
        });

        it("check if deposit is open", async () => {
            assert.equal(await ctx.FairFunding.methods.isDepositOpen().call(), true)
            await ctx.EVM.increaseTime(86400)
            assert.equal(await ctx.FairFunding.methods.isDepositOpen().call(), false)
        });

        it("check if funding is end", async () => {
            assert.equal(await ctx.FairFunding.methods.isFundingEnd().call(), false)
            await ctx.EVM.increaseTime(86400 * 2 + 1)
            assert.equal(await ctx.FairFunding.methods.isFundingEnd().call(), true)
        });

        it("check if is Settled",async () => {
            assert.equal(await ctx.FairFunding.methods.isSettled().call(), false)
            await ctx.EVM.increaseTime(86400 * 2 + 1)
            await logGas(ctx.FairFunding.methods.settle(), ctx.sendParam(ctx.Deployer), "settle") 
            assert.equal(await ctx.FairFunding.methods.isSettled().call(), true)
        })
    });

    describe("Deposit Funds", () => {
        it("successfully deposit funds", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, 3).send(ctx.sendParam(user1));
            var tx = await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");
            var account = tx.events['DepositFund'].returnValues['account'];
            var fundAmount = tx.events['DepositFund'].returnValues['fundAmount'];
            assert.equal(account, user1);
            assert.equal(fundAmount, 3);
        })

        it("revert if the deposit is not open", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, 3).send(ctx.sendParam(user1));
            await ctx.EVM.increaseTime(86400);
            await truffleAssert.reverts(ctx.FairFunding.methods.depositFunds(user1).send(ctx.sendParam(user1)), "DEPOSIT_NOT_OPEN")
        })
    });

    describe("Withdraw Funds", () => {
        it("successfully withdraw funds", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, 3).send(ctx.sendParam(user1));
            await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");

            var tx = await logGas(ctx.FairFunding.methods.withdrawFunds(user1, 3), ctx.sendParam(user1), "withdrawFunds");
            var to = tx.events['WithdrawFund'].returnValues['to'];
            var fundAmount = tx.events['WithdrawFund'].returnValues['fundAmount'];
            assert.equal(to, user1);
            assert.equal(fundAmount, 3);
        })

        it("revert if withdraw too much", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, 3).send(ctx.sendParam(user1));
            await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");
            await truffleAssert.reverts(ctx.FairFunding.methods.withdrawFunds(user1, 4).send(ctx.sendParam(user1)), "WITHDRAW_TOO_MUCH")
        })
    });

    describe("Claim Token", () => {
        it("successfully claim token", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, 3).send(ctx.sendParam(user1));
            await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");

            await ctx.EVM.increaseTime(86400 * 2 + 1)
            await logGas(ctx.FairFunding.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")

            var tx = await logGas(ctx.FairFunding.methods.claimToken(user1), ctx.sendParam(user1), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user1);
            assert.equal(tokenAmount, 3);
        })

        it("revert if not settled", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("10000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, 3).send(ctx.sendParam(user1));
            await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");
            await truffleAssert.reverts(ctx.FairFunding.methods.claimToken(user1).send(ctx.sendParam(user1)), "NOT_SETTLED")
        })
    });

    describe("Integration", () => {
        it("case1: user1 deposit 8000, user2 deposit 8000", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("8000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, decimalStr("8000")).send(ctx.sendParam(user1));
            await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");

            await ctx.FundToken.methods.mint(user2, decimalStr("8000")).send(ctx.sendParam(user2));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, decimalStr("8000")).send(ctx.sendParam(user2));
            await logGas(ctx.FairFunding.methods.depositFunds(user2), ctx.sendParam(user2), "depositFunds");

            await ctx.EVM.increaseTime(86400 * 2 + 1)
            await logGas(ctx.FairFunding.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")

            var tx = await logGas(ctx.FairFunding.methods.claimToken(user1), ctx.sendParam(user1), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user1);
            assert.equal(tokenAmount, decimalStr("5000"));
            assert.equal(await ctx.SellToken.methods.balanceOf(user1).call(), decimalStr("5000"));

            var tx = await logGas(ctx.FairFunding.methods.claimToken(user2), ctx.sendParam(user2), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user2);
            assert.equal(tokenAmount, decimalStr("5000"));
            assert.equal(await ctx.SellToken.methods.balanceOf(user2).call(), decimalStr("5000"));
        })

        it("case2: user1 deposit 2000, user2 deposit 8000", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("2000")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, decimalStr("2000")).send(ctx.sendParam(user1));
            await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");

            await ctx.FundToken.methods.mint(user2, decimalStr("8000")).send(ctx.sendParam(user2));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, decimalStr("8000")).send(ctx.sendParam(user2));
            await logGas(ctx.FairFunding.methods.depositFunds(user2), ctx.sendParam(user2), "depositFunds");

            await ctx.EVM.increaseTime(86400 * 2 + 1)
            await logGas(ctx.FairFunding.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")

            var tx = await logGas(ctx.FairFunding.methods.claimToken(user1), ctx.sendParam(user1), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user1);
            assert.equal(tokenAmount, decimalStr("2000"));
            assert.equal(await ctx.SellToken.methods.balanceOf(user1).call(), decimalStr("2000"));

            var tx = await logGas(ctx.FairFunding.methods.claimToken(user2), ctx.sendParam(user2), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user2);
            assert.equal(tokenAmount, decimalStr("8000"));
            assert.equal(await ctx.SellToken.methods.balanceOf(user2).call(), decimalStr("8000"));
        })

        it("case3: user1 deposit 20, user2 deposit 80", async () => {
            await ctx.FundToken.methods.mint(user1, decimalStr("20")).send(ctx.sendParam(user1));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, decimalStr("20")).send(ctx.sendParam(user1));
            await logGas(ctx.FairFunding.methods.depositFunds(user1), ctx.sendParam(user1), "depositFunds");

            await ctx.FundToken.methods.mint(user2, decimalStr("80")).send(ctx.sendParam(user2));
            await ctx.FundToken.methods.transfer(ctx.FairFunding.options.address, decimalStr("80")).send(ctx.sendParam(user2));
            await logGas(ctx.FairFunding.methods.depositFunds(user2), ctx.sendParam(user2), "depositFunds");

            await ctx.EVM.increaseTime(86400 * 2 + 1)
            await logGas(ctx.FairFunding.methods.settle(), ctx.sendParam(ctx.Deployer), "settle")

            var tx = await logGas(ctx.FairFunding.methods.claimToken(user1), ctx.sendParam(user1), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user1);
            assert.equal(tokenAmount, decimalStr("20"));
            assert.equal(await ctx.SellToken.methods.balanceOf(user1).call(), decimalStr("20"));

            var tx = await logGas(ctx.FairFunding.methods.claimToken(user2), ctx.sendParam(user2), "claimToken");
            var to = tx.events['ClaimToken'].returnValues['to'];
            var tokenAmount = tx.events['ClaimToken'].returnValues['tokenAmount'];
            assert.equal(to, user2);
            assert.equal(tokenAmount, decimalStr("80"));
            assert.equal(await ctx.SellToken.methods.balanceOf(user2).call(), decimalStr("80"));
        })
    });
});

