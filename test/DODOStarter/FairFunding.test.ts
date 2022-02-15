/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, MAX_UINT256 } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DODOStarterContext,getDODOStarterContext } from '../utils/DODOStarterContext';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import BigNumber from 'bignumber.js';
import { StringLiteralLike } from 'typescript';
const truffleAssert = require('truffle-assertions');

let maker: string;
let user: string;

async function init(ctx: NFTPoolContext): Promise<void> {
    maker = ctx.SpareAccounts[0];
    user = ctx.SpareAccounts[1];
}

async function createFairFunding(ctx: DODOStarterContext) {
    // var tx = await logGas(ctx.DODONFTPoolProxy.methods.createNewNFTPoolV1(
    //     maker,
    //     ctx.DodoNft.options.address,
    //     1,
    //     ['Filter01', 'FRAG', 'FRAG'],
    //     [decimalStr("10000000"), decimalStr("0.005")],
    //     [true, true, true],
    //     [0, 4, 5, 1],
    //     [decimalStr("1"), decimalStr("0.9"), decimalStr("1"), decimalStr("0.9"), decimalStr("2"), decimalStr("0.9")],
    //     [7]
    // ), ctx.sendParam(maker), "createNewNFTPoolV1");

    // var newFilterAdmin = tx.events['CreateNFTPool'].returnValues['newFilterAdmin']
    // var filter = tx.events['CreateNFTPool'].returnValues['filter']

    // return [newFilterAdmin, filter];
}

describe("FairFunding", () => {
    let snapshotId: string;
    let ctx: DODOStarterContext;

    before(async () => {
        ctx = await getDODOStarterContext();
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("FairFunding", () => {
        it("Create_FairFunding", async () => {
            // var tx = await logGas(ctx.DODONFTPoolProxy.methods.createNewNFTPoolV1(
            //     maker,
            //     ctx.DodoNft.options.address,
            //     1,
            //     ['Filter01', 'FRAG', 'FRAG'],
            //     [decimalStr("10000000"), decimalStr("0.005")],
            //     [true, true, true],
            //     [0, 3, 2, 1],
            //     [decimalStr("1"), decimalStr("1.1"), decimalStr("1"), decimalStr("1.1"), decimalStr("2"), decimalStr("1.1")],
            //     [5]
            // ), ctx.sendParam(maker), "createNewNFTPoolV1");

            // var newFilterAdmin = tx.events['CreateNFTPool'].returnValues['newFilterAdmin']
            // var filter = tx.events['CreateNFTPool'].returnValues['filter']

            // console.log("newFilterAdmin:", newFilterAdmin)
            // console.log("filterV1:", filter)

            // assert.equal(
            //     tx.events['CreateNFTPool'].returnValues['filterAdminOwner'],
            //     maker
            // )
        });
    });
});

