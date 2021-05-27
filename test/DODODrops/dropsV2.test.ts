/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import { decimalStr, fromWei} from '../utils/Converter';
import { logGas } from '../utils/Log';
import { assert } from 'chai';
import { Contract } from 'web3-eth-contract';
import * as contracts from '../utils/Contracts';
import { DropsContext, getDropsContext } from '../utils/DropsContext';
import { DVMContext, getDVMContext } from '../utils/DVMContext';

let maintainer: string;
let user1: string;
let user2: string;
let user3: string;
let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
let RandomGenerator: Contract;

async function init(ctx: DropsContext, ctxDVM: DVMContext, isReveal: Boolean, mode: Boolean): Promise<void> {
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


    var nftContract;
    if(mode) {
        nftContract = ctx.DropsERC1155.options.address
    }else {
        nftContract = ctx.DropsERC721.options.address
    }
    var rngAddress;
    if (isReveal) {
        rngAddress = ZERO_ADDRESS;
    }else {
        await ctxDVM.mintTestToken(maintainer, decimalStr("10"), decimalStr("1000"));
        await ctxDVM.transferBaseToDVM(maintainer, decimalStr("10"))
        await ctxDVM.transferQuoteToDVM(maintainer, decimalStr("1000"))
        await ctxDVM.DVM.methods.buyShares(maintainer).send(ctx.sendParam(maintainer));

        RandomGenerator = await contracts.newContract(contracts.RANDOM_GENERATOR,
            [
                [
                    ctxDVM.DVM.options.address,
                    ctxDVM.DVM.options.address,
                    ctxDVM.DVM.options.address
                ]
            ]
        )
        rngAddress = RandomGenerator.options.address
    }

    var addrList = [
        ctx.Deployer,
        ctx.DODO.options.address,
        ctx.DropsFeeModel.options.address,
        maintainer,
        rngAddress,
        nftContract
    ]

    var curTime = Math.floor(new Date().getTime() / 1000)

    await ctx.DropsV2.methods.init(
        addrList,
        [curTime + 10, curTime + 20, curTime + 30],
        [10000000000000, 10000000000000, 0],
        [10, 10, 0],
        curTime + 10,
        isReveal,
        mode
    ).send(ctx.sendParam(ctx.Deployer));

}

async function setReveal(ctx: DropsContext) {
    await ctx.DropsV2.methods.setRevealRn().send(ctx.sendParam(ctx.Deployer));
}

async function setTokenIdList(ctx: DropsContext) {
    var tokenList = [1, 2, 3, 4, 5, 6, 7, 8]
    await ctx.DropsV2.methods.setFixedAmountInfo(tokenList).send(ctx.sendParam(ctx.Deployer));
}

async function setProbMap(ctx: DropsContext) {
    var probIntervals = [1, 5, 20, 50, 100]
    var tokenIdMaps = [
        [0],
        [1, 2],
        [3, 4, 5],
        [6, 7],
        [8, 9, 10, 11]
    ]
    await ctx.DropsV2.methods.setProbInfo(probIntervals, tokenIdMaps).send(ctx.sendParam(ctx.Deployer));
}

async function getTicketsInfo(ctx: DropsContext, user: string): Promise<[string, string]> {
    var totalTickets = await ctx.DropsV2.methods.totalSupply().call();
    var userTickets = await ctx.DropsV2.methods.balanceOf(user).call();
    console.log("User Tickets:" + userTickets + " totalTickets:" + totalTickets);
    return [totalTickets, userTickets];
}

async function getBuyTokenBalance(ctx: DropsContext, user: string, token: Contract): Promise<[string, string]> {
    var userDodo = await token.methods.balanceOf(user).call();
    var dropsDodo = await token.methods.balanceOf(ctx.DropsV2.options.address).call();
    console.log("User Dodo:" + userDodo + " Drops Dodo:" + dropsDodo);
    return [userDodo, dropsDodo];
}

async function getNFTOwner(nft721: Contract, tokenId: number): Promise<string> {
    var userAddr = await nft721.methods.ownerOf(tokenId).call();
    return userAddr
}

async function getNFTBalance(nft1155: Contract, user:string, tokenId: number): Promise<[number]> {
    var num = await nft1155.methods.balanceOf(user, tokenId).call();
    return num
}


describe("DODODropsV2", () => {
    let snapshotId: string;
    let ctx: DropsContext;
    let ctxDVM: DVMContext;

    before(async () => {
        let config = {
            lpFeeRate: decimalStr("0.002"),
            mtFeeRate: decimalStr("0.001"),
            k: decimalStr("1"),
            i: "1",
        };
        ctxDVM = await getDVMContext(config);
        ctx = await getDropsContext();
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("DODODropsV2", () => {
        it("buyTicket", async () => {
            await init(ctx, ctxDVM, true, false);
            await ctx.EVM.increaseTime(10);
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 2), ctx.sendParam(user1), "buyTickets-user1");
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 3), ctx.sendParam(user2), "buyTickets-user2");

            var [totalSupply,] = await getTicketsInfo(ctx, user1)
            assert(totalSupply, '5')

            var [, dropsDodoBalance] = await getBuyTokenBalance(ctx, user1, ctx.DODO)
            assert(dropsDodoBalance, decimalStr('0.00005'))
        });

        it("redeemPrize-fixedAmount-reveal", async () => {
            await init(ctx, ctxDVM, true, false);
            await setTokenIdList(ctx);
            await ctx.EVM.increaseTime(10);
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 2), ctx.sendParam(user1), "buyTickets-user1");

            await setReveal(ctx);

            var tx = await logGas(await ctx.DropsV2.methods.redeemTicket(1, ZERO_ADDRESS), ctx.sendParam(user1), "redeem-prize");
            var tokenId = tx.events['RedeemPrize'].returnValues['tokenId'];

            var nftOwner = await getNFTOwner(ctx.DropsERC721, tokenId);

            assert(user1, nftOwner);
        });

        it("redeemPrize-probAmount-reveal", async () => {
            await init(ctx, ctxDVM, true, true);
            await setProbMap(ctx);
            await ctx.EVM.increaseTime(10);
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 2), ctx.sendParam(user1), "buyTickets-user1");

            await setReveal(ctx);

            var tx = await logGas(await ctx.DropsV2.methods.redeemTicket(1, ZERO_ADDRESS), ctx.sendParam(user1), "redeem-prize");
            var tokenId = tx.events['RedeemPrize'].returnValues['tokenId'];

            var nftAmount = await getNFTBalance(ctx.DropsERC1155, user1, tokenId);

            console.log("nftAmount:", nftAmount);

            assert(nftAmount, '1');
        });


        it("redeemPrize-fixedAmount-rng", async () => {
            await init(ctx, ctxDVM, false, false);
            await setTokenIdList(ctx);
            await ctx.EVM.increaseTime(10);
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 2), ctx.sendParam(user1), "buyTickets-user1");

            var tx = await logGas(await ctx.DropsV2.methods.redeemTicket(1, ZERO_ADDRESS), ctx.sendParam(user1), "redeem-prize");
            var tokenId = tx.events['RedeemPrize'].returnValues['tokenId'];
            console.log("tokenId:", tokenId);
            var nftOwner = await getNFTOwner(ctx.DropsERC721, tokenId);

            assert(user1, nftOwner);
        });

        it("redeemPrize-probAmount-rng", async () => {
            await init(ctx, ctxDVM, false, true);
            await setProbMap(ctx);
            await ctx.EVM.increaseTime(10);
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 2), ctx.sendParam(user1), "buyTickets-user1");

            var tx = await logGas(await ctx.DropsV2.methods.redeemTicket(1, ZERO_ADDRESS), ctx.sendParam(user1), "redeem-prize");
            var tokenId = tx.events['RedeemPrize'].returnValues['tokenId'];

            var nftAmount = await getNFTBalance(ctx.DropsERC1155, user1, tokenId);

            console.log("nftAmount:", nftAmount);

            assert(nftAmount, '1');
        });

        it("setProbMap", async () => {
            await init(ctx, ctxDVM, true, true);
            var probIntervals = [4, 10, 50, 100, 105]
            var tokenIdMaps = [
                [0],
                [1, 38],
                [3, 4, 5],
                [6, 7],
                [19, 30, 35, 40]
            ]
            await logGas(await ctx.DropsV2.methods.setProbInfo(probIntervals, tokenIdMaps), ctx.sendParam(ctx.Deployer), "setProbInfo");
            var prob = await ctx.DropsV2.methods._PROB_INTERVAL_(0).call();
            assert(prob, '4')
            var tokenId = await ctx.DropsV2.methods._TOKEN_ID_MAP_(1, 1).call();
            assert(tokenId, '38')
        })

        it("setTokenList", async () => {
            await init(ctx, ctxDVM, true, false);
            var tokenList = [4, 10, 50, 100, 105]
            await logGas(await ctx.DropsV2.methods.setFixedAmountInfo(tokenList), ctx.sendParam(ctx.Deployer), "setFixedAmountInfo");
            var tokenId = await ctx.DropsV2.methods._TOKEN_ID_LIST_(1).call();
            assert(tokenId, '10')
        })

        it("withdraw", async () => {
            await init(ctx, ctxDVM, true, true);
            await setProbMap(ctx);
            await ctx.EVM.increaseTime(10);
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 2), ctx.sendParam(user1), "buyTickets-user1");
            await logGas(await ctx.DropsProxy.methods.buyTickets(ctx.DropsV2.options.address, 3), ctx.sendParam(user2), "buyTickets-user2");

            var b_drops_balance = await ctx.DODO.methods.balanceOf(ctx.DropsV2.options.address).call()
            var b_owner = await ctx.DODO.methods.balanceOf(ctx.Deployer).call();
            
            await ctx.DropsV2.methods.withdraw().send(ctx.sendParam(ctx.Deployer));

            var a_drops_balance = await ctx.DODO.methods.balanceOf(ctx.DropsV2.options.address).call()
            var a_owner = await ctx.DODO.methods.balanceOf(ctx.Deployer).call();

            console.log("b_drops_balance:", fromWei(b_drops_balance, 'ether'))
            console.log("a_drops_balance:", fromWei(a_drops_balance, 'ether'))

            console.log("b_owner:", fromWei(b_owner, 'ether'))
            console.log("a_owner:", fromWei(a_owner, 'ether'))
            assert(a_owner, decimalStr("0.00005"))
        })
    });
});
