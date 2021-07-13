/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import { decimalStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';
const truffleAssert = require('truffle-assertions');

let owner: string;
let user1: string;
let user2: string;
let user3: string;

var urls = [
    "ipfs://QmbfDhXJG5MCqJfYyiSN8YnNWV9iGyd15PqAysGwmE5WMp",
    "ipfs://QmatCfrHHFf31ik29dNjnwFhZdpiNsK1VrA2omYsyPR3h1",
    "ipfs://Qmbh6R7YQpBAhE1DK6tFoxa8BWaJmkzrq8Z2Q8StSJhveq",
    "ipfs://QmWuwBk7V9ehm8ojxsmB9d1mYeEE1LSJkxTrFbmAiGKrT3",
    "ipfs://QmTYVLtmgv2BzWi5qqRL3XZb6xTQj1UbhzU7N4VEk3SG4z",
    "ipfs://QmNfGx7YAnPDauDMddDKoDE9QvaQzVrBkitPNpBfRvi9TM",
    "ipfs://QmVRKLYq3DtKHAe7W5o1MAQGPXWn8uLiGBrtYg9337fFdS",
    "ipfs://QmQDgqN8LjEPEJ9Demv6F2nEXw2RBPJttpMh3LtwxjL8vV",
    "ipfs://QmZuNBHTfRPpJWB7zHKyF5S8yd7MQrKyBQ2QFuUo5WfK97",
    "ipfs://QmfM9KWipChobyKxPyuGUqygvddqTtWQAtrzkqG2WfiCQn"
]

let RandomGenerator: Contract;
let MysteryBoxV1: Contract;

async function init(ctx: DVMContext): Promise<void> {
    owner = ctx.SpareAccounts[1];
    user1 = ctx.SpareAccounts[2];
    user2 = ctx.SpareAccounts[3];
    user3 = ctx.SpareAccounts[4];

    await ctx.mintTestToken(owner, decimalStr("10"), decimalStr("1000"));
    await ctx.transferBaseToDVM(owner, decimalStr("10"))
    await ctx.transferQuoteToDVM(owner, decimalStr("1000"))
    await ctx.DVM.methods.buyShares(owner).send(ctx.sendParam(owner));

    RandomGenerator = await contracts.newContract(contracts.RANDOM_GENERATOR,
        [
            [
                ctx.DVM.options.address,
                ctx.DVM.options.address,
                ctx.DVM.options.address
            ]
        ]
    )

    MysteryBoxV1 = await contracts.newContract(contracts.MYSTERY_BOX_V1)
    await MysteryBoxV1.methods.init(
        "DODOMYSTERT",
        "BOX",
        "",
        owner,
        RandomGenerator.options.address
    ).send(ctx.sendParam(owner));
}

async function getTokenIdAndUrlByUser(user: string, logInfo?: string) {
    var tokenIds = []
    var urls = []
    var balance = await MysteryBoxV1.methods.balanceOf(user).call();
    console.log(logInfo);
    for (var i = 0; i < balance; i++) {
        var curTokenId = await MysteryBoxV1.methods.tokenOfOwnerByIndex(user, i).call()
        tokenIds.push(curTokenId);
        var curUrl = await MysteryBoxV1.methods.tokenURI(curTokenId).call();
        urls.push(curUrl);
        console.log("tokenId:" + curTokenId + " uri:" + curUrl);
    }
    return [tokenIds, urls];
}

async function getTicketsInfo(user: string): Promise<[string, string]> {
    var totalTickets = await MysteryBoxV1.methods._TOTAL_TICKETS_().call();
    var userTickets = await MysteryBoxV1.methods.getTickets(user).call();
    console.log("User Tickets:" + userTickets + " totalTickets:" + totalTickets);
    return [totalTickets, userTickets];
}

async function getGlobalState(): Promise<[string, string]> {
    var curSelling = await MysteryBoxV1.methods._CUR_SELLING_TICKETS_().call();
    var curPrice = await MysteryBoxV1.methods._CUR_PRCIE_().call();
    console.log("CurSellingTickets:" + curSelling + " CurPrice:" + fromWei(curPrice, 'ether'));

    return [curSelling, curPrice];
}

async function batchMint(ctx: DVMContext) {
    var ids = []
    for (var i = 0; i < urls.length; i++) {
        ids.push(i);
    }
    await logGas(await MysteryBoxV1.methods.batchMint(ids, urls), ctx.sendParam(owner), "batchMint-10");
}

describe("DODOMysteryBox", () => {
    let snapshotId: string;
    let ctx: DVMContext;

    before(async () => {
        let config = {
            lpFeeRate: decimalStr("0.002"),
            mtFeeRate: decimalStr("0.001"),
            k: decimalStr("1"),
            i: "1",
        };
        ctx = await getDVMContext(config);
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODO MysteryBoxV1", () => {
        it("batchMint", async () => {
            var ids = []
            for (var i = 0; i < urls.length; i++) {
                ids.push(i);
            }
            await logGas(await MysteryBoxV1.methods.batchMint(ids, urls), ctx.sendParam(owner), "batchMint-10");
            let [tokenIds,]: any = await getTokenIdAndUrlByUser(MysteryBoxV1.options.address);
            assert(10, tokenIds.length);
        });

        it("buyTicket", async () => {
            await MysteryBoxV1.methods.updateSellingInfo(100, decimalStr("0.01")).send(ctx.sendParam(owner));
            await truffleAssert.reverts(
                MysteryBoxV1.methods.buyTicket().send(ctx.sendParam(user1, "0.001")),
                "BNB_NOT_ENOUGH"
            )
            await logGas(await MysteryBoxV1.methods.buyTicket(), ctx.sendParam(user1, "0.5"), "buyTickets");
            await logGas(await MysteryBoxV1.methods.buyTicket(), ctx.sendParam(user2, "0.4"), "buyTickets");
            await truffleAssert.reverts(
                MysteryBoxV1.methods.buyTicket().send(ctx.sendParam(user1, "0.2")),
                "TICKETS_NOT_ENOUGH"
            )
            let [, userTickets] = await getTicketsInfo(user1)
            assert(userTickets, "50")
            let [curSelling0] = await getGlobalState()
            assert(curSelling0, "10")

            await MysteryBoxV1.methods.updateSellingInfo(200, decimalStr("0.02")).send(ctx.sendParam(owner));
            await logGas(await MysteryBoxV1.methods.buyTicket(), ctx.sendParam(user1, "1"), "buyTickets");
            [, userTickets] = await getTicketsInfo(user1)
            assert(userTickets, "100")
            let [curSelling1] = await getGlobalState();
            assert(curSelling1, "150")

            //withdraw 
            var b_ETH = await ctx.Web3.eth.getBalance(owner);
            var tx = await MysteryBoxV1.methods.withdraw().send(ctx.sendParam(owner))
            var a_ETH = await ctx.Web3.eth.getBalance(owner);
            console.log("b_ETH:" + fromWei(b_ETH, 'ether') + " a_ETH:" + fromWei(a_ETH, 'ether'));
            assert.equal(
                tx.events['Withdraw'].returnValues['amount'],
                decimalStr("1.9")
            );
        });

        it("redeemPrize", async () => {
            await batchMint(ctx);

            await MysteryBoxV1.methods.updateSellingInfo(100, decimalStr("0.1")).send(ctx.sendParam(owner));
            await logGas(await MysteryBoxV1.methods.buyTicket(), ctx.sendParam(user1, "0.5"), "buyTickets");

            await getTicketsInfo(user1)
            await getGlobalState()
            await getTokenIdAndUrlByUser(user1, "redeemPrize前")
            await getTokenIdAndUrlByUser(MysteryBoxV1.options.address, "盲盒合约：redeemPrize前")

            await logGas(await MysteryBoxV1.methods.redeemPrize(3), ctx.sendParam(user1), "redeemPrice");
            await getTicketsInfo(user1)
            await getGlobalState()
            await getTokenIdAndUrlByUser(user1, "第一次redeemPrize后")

            await logGas(await MysteryBoxV1.methods.redeemPrize(2), ctx.sendParam(user1), "redeemPrice");
            let [, userTickets] = await getTicketsInfo(user1)
            assert(userTickets, "0");
            await getGlobalState()
            await getTokenIdAndUrlByUser(user1, "第二次redeemPrize后")
            let [tokenIds,] = await getTokenIdAndUrlByUser(MysteryBoxV1.options.address, "盲盒合约：redeemPrize后")
            assert(tokenIds, "5");
        });


        it("transferNFT", async () => {
            await batchMint(ctx);
            await MysteryBoxV1.methods.updateSellingInfo(100, decimalStr("0.1")).send(ctx.sendParam(owner));
            await logGas(await MysteryBoxV1.methods.buyTicket(), ctx.sendParam(user1, "0.5"), "buyTickets");
            await logGas(await MysteryBoxV1.methods.redeemPrize(1), ctx.sendParam(user1), "redeemPrice");
            let [tokenId0,] = await getTokenIdAndUrlByUser(user1, "user1 转前")
            assert(tokenId0.length == 1)
            await getTokenIdAndUrlByUser(user2, "user2 转前")

            await logGas(await MysteryBoxV1.methods.safeTransferFrom(user1, user2, tokenId0[0]), ctx.sendParam(user1), "transferNFT");

            await getTokenIdAndUrlByUser(user1, "user1 转后")
            let [tokenId1,] = await getTokenIdAndUrlByUser(user2, "user2 转后")
            assert(tokenId1.length == 1)
        });
    });
});
