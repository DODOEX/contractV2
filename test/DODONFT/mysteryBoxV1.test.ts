/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import { decimalStr, mweiStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { DVMContext, getDVMContext } from '../utils/DVMContext';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
import { Contract } from 'web3-eth-contract';

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

async function getTokenIdAndUrlByUser(user: string) {
    var tokenIds = []
    var urls = []
    var balance = await MysteryBoxV1.methods.balanceOf(user).call();
    for (var i = 0; i < balance; i++) {
        var curTokenId = await MysteryBoxV1.methods.tokenOfOwnerByIndex(user, i).call()
        tokenIds.push(curTokenId);
        var curUrl = await MysteryBoxV1.methods.tokenURI(curTokenId).call();
        urls.push(curUrl);
        console.log("tokenId:" + curTokenId + " uri:" + curUrl);
    }
    return [tokenIds, urls];
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
        it.only("batchMint", async () => {
            await logGas(await MysteryBoxV1.methods.batchMint(urls), ctx.sendParam(owner), "batchMint-10");
            let [tokenIds,]: any = await getTokenIdAndUrlByUser(MysteryBoxV1.options.address);
            assert(10, tokenIds.length);
        });

        it("buyTicket", async () => {
            await MysteryBoxV1.methods.updateSellingInfo(100, decimalStr("0.5")).send(ctx.sendParam(owner));

            //两阶段卖币

            //withdraw 
        });

        it("redeemPrize", async () => {
            //redeem

            //列表查询

        });


        it("transferNFT", async () => {

        });
    });
});
