/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';
import { DropsContext, getDropsContext } from '../utils/DropsContext';
const truffleAssert = require('truffle-assertions');

let maintainer: string;
let user1: string;
let user2: string;
let user3: string;

async function init(ctx: DropsContext): Promise<void> {
    maintainer = ctx.SpareAccounts[0];
    user1 = ctx.SpareAccounts[1];
    user2 = ctx.SpareAccounts[2];
    user3 = ctx.SpareAccounts[3];

    await ctx.mintTestToken(user1, ctx.DODO, decimalStr("10000"));
    await ctx.mintTestToken(user2, ctx.DODO, decimalStr("10000"));
    await ctx.mintTestToken(user3, ctx.DODO, decimalStr("10000"));
    await ctx.approveProxy(ctx.DODO, user1);
    await ctx.approveProxy(ctx.DODO, user2);
    await ctx.approveProxy(ctx.DODO, user3);

    var addrList = [
        ctx.Deployer,
        ctx.DODO.options.address,
        ctx.DropsFeeModel.options.address,
        maintainer,
        "0x0000000000000000000000000000000000000000",
        ctx.DropsERC721.options.address
    ]

    var curTime = Math.floor(new Date().getTime() / 1000)

    await ctx.DropsV2.methods.init(
        addrList,
        [curTime + 10, curTime + 20, curTime + 30],
        [10000000000000, 10000000000000, 10000000000000],
        [10, 10, 0],
        curTime+10,
        true,
        false
    ).send(ctx.sendParam(ctx.Deployer));

}

async function getTicketsInfo(ctx: DropsContext, user: string): Promise<[string, string]> {
    var totalTickets = await ctx.DropsV2.methods.totalSupply().call();
    var userTickets = await ctx.DropsV2.methods.balanceOf(user).call();
    console.log("User Tickets:" + userTickets + " totalTickets:" + totalTickets);
    return [totalTickets, userTickets];
}

async function getBuyTokenBalance(ctx: DropsContext, user: string, token: Contract): Promise<[string,string]> {
    var userDodo = await token.methods.balanceOf(user).call();
    var dropsDodo = await token.methods.balanceOf(ctx.DropsV2.options.address).call();
    console.log("User Dodo:" + userDodo + " Drops Dodo:" + dropsDodo);
    return [userDodo, dropsDodo];
}


describe("DODODropsV2", () => {
    let snapshotId: string;
    let ctx: DropsContext;

    before(async () => {
        ctx = await getDropsContext();
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODODropsV2", () => {
        it("buyTicket", async () => {
            // await ctx.EVM.increaseTime(10);
            // await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address,2), ctx.sendParam(user1), "buyTickets");
            // await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address,3), ctx.sendParam(user2), "buyTickets");

            // await getTicketsInfo(ctx, user1)
            // await getTicketsInfo(ctx, user2)

            // await getBuyTokenBalance(ctx, user1, ctx.DODO)
            // await getBuyTokenBalance(ctx, user2, ctx.DODO)
        });

        it("redeemPrize", async () => {

        });

        //Owner 设置

    });
});
