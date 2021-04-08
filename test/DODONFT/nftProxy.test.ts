/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import { decimalStr, mweiStr } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { NFTContext, getDODONftContext } from '../utils/NFTContext';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';

let author: string;
let user1: string;
let user2: string;

async function init(ctx: NFTContext): Promise<void> {
    author = ctx.SpareAccounts[1];
    user1 = ctx.SpareAccounts[2];
    user2 = ctx.SpareAccounts[3];

    await ctx.mintTestToken(user1, ctx.USDT, mweiStr("10000"));
    await ctx.mintTestToken(user2, ctx.USDT, mweiStr("10000"));

    await ctx.approveProxy(user1);
    await ctx.approveProxy(user2);
}


describe("DODONFTProxy", () => {
    let snapshotId: string;
    let ctx: NFTContext;


    before(async () => {
        let ETH = await contracts.newContract(
            contracts.WETH_CONTRACT_NAME
        );
        ctx = await getDODONftContext(ETH.options.address);
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODONFTProxy", () => {
        it("createNFTVault", async () => {

        });

        it("buyout", async () => {

        });

        it("AddLiquidity", async () => {

        });

        it("AddLiquidity", async () => {

        });
    });
});
