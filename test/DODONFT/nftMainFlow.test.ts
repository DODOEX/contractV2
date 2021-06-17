/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
import { decimalStr, mweiStr, fromWei } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { NFTContext, getDODONftContext } from '../utils/NFTContext';
import { assert } from 'chai';
import * as contracts from '../utils/Contracts';
const truffleAssert = require('truffle-assertions');

let author: string;
let user1: string;
let user2: string;
let buyer: string;

async function init(ctx: NFTContext): Promise<void> {
    author = ctx.SpareAccounts[1];
    user1 = ctx.SpareAccounts[2];
    user2 = ctx.SpareAccounts[3];
    buyer = ctx.SpareAccounts[4];

    await ctx.mintTestToken(user1, ctx.USDT, mweiStr("10000"));
    await ctx.mintTestToken(user2, ctx.USDT, mweiStr("10000"));
    await ctx.mintTestToken(buyer, ctx.USDT, mweiStr("1000000000"));

    await ctx.approveProxy(ctx.USDT, user1);
    await ctx.approveProxy(ctx.USDT, user2);
    await ctx.approveProxy(ctx.USDT, buyer);
}

// async function getFeeGlobalState(ctx: NFTContext, feeAddress: string, baseToken, quoteToken, stakeToken) {
//     let feeInstance = contracts.getContractWithAddress(contracts.NFT_FEE, feeAddress);
//     let baseReserve = await feeInstance.methods._BASE_RESERVE_().call();
//     let quoteReserve = await feeInstance.methods._QUOTE_RESERVE_().call();
//     let baseBalance = await baseToken.methods.balanceOf(feeAddress).call();
//     let quoteBalance = await quoteToken.methods.balanceOf(feeAddress).call();
//     let stakeVault = await feeInstance.methods._STAKE_VAULT_().call();
//     let stakeBalance = await stakeToken.methods.balanceOf(stakeVault).call();
//     let stakeReserve = await feeInstance.methods._STAKE_RESERVE_().call();
//     let baseRatio = await feeInstance.methods._BASE_REWARD_RATIO_().call();
//     let quoteRatio = await feeInstance.methods._QUOTE_REWARD_RATIO_().call();

//     console.log("fee baseBalance:" + fromWei(baseBalance, 'ether') + " quoteBalance:" + fromWei(quoteBalance, 'mwei') + " vault stakeBalance:" + fromWei(stakeBalance, 'ether'));
//     console.log("fee baseReserve:" + fromWei(baseReserve, 'ether') + " quoteReserve:" + fromWei(quoteReserve, 'mwei') + " stakeReserve:" + fromWei(stakeReserve, 'ether'));
//     console.log("baseRatio:" + fromWei(baseRatio, 'ether') + " quoteRatio:" + fromWei(quoteRatio, 'mwei'));

//     return {
//         "baseReserve": baseReserve,
//         "quoteReserve": quoteReserve,
//         "stakeReserve": stakeReserve,
//         "baseBalance": baseBalance,
//         "quoteBalance": quoteBalance,
//         "stakeBalance": stakeBalance,
//         "baseRatio": baseRatio,
//         "quoteRatio": quoteRatio
//     }
// }

// async function getFeeUserState(ctx: NFTContext, feeAddress: string, userAddress: string) {
//     let feeInstance = contracts.getContractWithAddress(contracts.NFT_FEE, feeAddress);
//     let userShares = await feeInstance.methods._SHARES_(userAddress).call();
//     let [baseRewards, quoteRewards] = await feeInstance.methods.getPendingReward(userAddress).call();
//     let userBasePerShares = await feeInstance.methods._USER_BASE_PER_SHARE_(userAddress).call();
//     let userQuotePerShares = await feeInstance.methods._USER_QUOTE_PER_SHARE_(userAddress).call();

//     console.log("user shares:" + fromWei(userShares, 'ether'));
//     console.log("user baseRewards:" + fromWei(baseRewards, 'ether') + " userQuoteRewards:" + fromWei(quoteRewards, 'mwei'));
//     console.log("user basePerShares:" + fromWei(userBasePerShares, 'ether') + " userQuotePerShares:" + fromWei(userQuotePerShares, 'mwei'));

//     return {
//         "userShares": userShares,
//         "userBaseRewards": baseRewards,
//         "userQuoteRewards": quoteRewards,
//         "userBasePerShares": userBasePerShares,
//         "userQuotePerShares": userQuotePerShares
//     }
// }

async function mockTrade(ctx: NFTContext, dvmAddress: string, dvmInstance, fragInstance) {
    await ctx.transferQuoteToDVM(ctx.USDT, dvmAddress, user1, mweiStr("20"));
    await dvmInstance.methods.sellQuote(user1).send(ctx.sendParam(user1));

    await ctx.transferBaseToDVM(fragInstance, dvmAddress, user1, decimalStr("10"));
    await dvmInstance.methods.sellBase(user1).send(ctx.sendParam(user1));

    await ctx.transferQuoteToDVM(ctx.USDT, dvmAddress, user2, mweiStr("80"));
    await dvmInstance.methods.sellQuote(user2).send(ctx.sendParam(user2));

    await ctx.transferBaseToDVM(fragInstance, dvmAddress, user2, decimalStr("20"));
    await dvmInstance.methods.sellBase(user2).send(ctx.sendParam(user2));
}

async function getUserBalance(user: string, baseToken, quoteToken, logInfo: string) {
    var baseBalance = await baseToken.methods.balanceOf(user).call();
    var quoteBalance = await quoteToken.methods.balanceOf(user).call();
    console.log(logInfo + " baseBalance:" + fromWei(baseBalance, 'ether') + " quoteBalance:" + fromWei(quoteBalance, 'mwei'));
    return [baseBalance, quoteBalance];
}



describe("DODONFT", () => {
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

    describe("DODONFTMainFlow", () => {
        it("createNFTVault", async () => {
            await logGas(await ctx.NFTProxy.methods.createNFTCollateralVault(
                "DODOVault",
                "https://app.dodoex.io"
            ), ctx.sendParam(author), "createNFTVault");
        });

        it("createTokenAndTransferToVault", async () => {
            var erc721Address = await ctx.createERC721(ctx, author);
            var vaultAddress = await ctx.createNFTVault(ctx, author);
            var nftVaultInstance = contracts.getContractWithAddress(contracts.NFT_VAULT, vaultAddress);
            var erc721Instance = contracts.getContractWithAddress(contracts.ERC721, erc721Address);
            await erc721Instance.methods.safeTransferFrom(author, vaultAddress, 0).send(ctx.sendParam(author));
            // var nftIndex = await nftVaultInstance.methods.getIdByTokenIdAndAddr(erc721Address, 0).call();
            // var nftInfo = await nftVaultInstance.methods.getNftInfoById(nftIndex).call();
            // assert(nftInfo.amount, '1')
            // assert(nftInfo.tokenId, '0')
        });

        it("createFragment", async () => {
            var erc721Address = await ctx.createERC721(ctx, author);
            var vaultAddress = await ctx.createNFTVault(ctx, author);
            var nftVaultInstance = contracts.getContractWithAddress(contracts.NFT_VAULT, vaultAddress);
            var erc721Instance = contracts.getContractWithAddress(contracts.ERC721, erc721Address);
            await erc721Instance.methods.safeTransferFrom(author, vaultAddress, 0).send(ctx.sendParam(author));

            // var quoteToken = "0x156595bAF85D5C29E91d959889B022d952190A64";
            // var vaultPreOwner = "0x7e83d9d94837eE82F0cc18a691da6f42F03F1d86";
            var quoteToken = ctx.USDT.options.address;
            var vaultPreOwner = author;

            var symbol = "HAHA"

            var params = [
                "0", //lpFeeRate
                mweiStr("1"), // I
                decimalStr("1"), // K
                decimalStr("100000000"), //totalSupply
                decimalStr("0.2"), //ownerRatio
                Math.floor(new Date().getTime() / 1000 + 60 * 60), //buyoutTimeStamp 1h later
                decimalStr("0")
            ]

            var isOpenTwap = false
            var callData = ctx.NFTProxy.methods.createFragment(
                [quoteToken,vaultPreOwner],
                params,
                isOpenTwap,
                symbol
            ).encodeABI();
            console.log("data:", callData);

            await logGas(await nftVaultInstance.methods.createFragment(
                ctx.NFTProxy.options.address,
                callData
            ), ctx.sendParam(author), "createFragment");

            let [fragAddress, , dvmAddress] = await ctx.getRegistry(ctx, vaultAddress);

            var dvmInstance = contracts.getContractWithAddress(contracts.DVM_NAME, dvmAddress);
            var midPrice = await dvmInstance.methods.getMidPrice().call();
            assert(midPrice, mweiStr("1"));
            let newVaultOwner = await nftVaultInstance.methods._OWNER_().call();
            assert(fragAddress, newVaultOwner);
        });

        // it("stakeToFeeDistributor", async () => {
        //     let [vaultAddress, fragAddress, feeAddress, dvmAddress] = await ctx.createFragment(ctx, author, null, null, null);

        //     var nftFeeInstance = contracts.getContractWithAddress(contracts.NFT_FEE, feeAddress);
        //     var dvmInstance = contracts.getContractWithAddress(contracts.DVM_NAME, dvmAddress);
        //     var fragInstance = contracts.getContractWithAddress(contracts.NFT_FRAG, fragAddress);
        //     await ctx.approveProxy(fragInstance, user1);
        //     await ctx.approveProxy(fragInstance, user2);
        //     //mock trading
        //     //stake
        //     await mockTrade(ctx, dvmAddress, dvmInstance, fragInstance);

        //     await logGas(await ctx.NFTProxy.methods.stakeToFeeDistributor(
        //         feeAddress,
        //         decimalStr("5"),
        //         0
        //     ), ctx.sendParam(user1), "stakeToFeeDistributor");

        //     await logGas(await ctx.NFTProxy.methods.stakeToFeeDistributor(
        //         feeAddress,
        //         decimalStr("10"),
        //         0
        //     ), ctx.sendParam(user2), "stakeToFeeDistributor");

        //     await mockTrade(ctx, dvmAddress, dvmInstance, fragInstance);

        //     await logGas(await ctx.NFTProxy.methods.stakeToFeeDistributor(
        //         feeAddress,
        //         decimalStr("10"),
        //         0
        //     ), ctx.sendParam(user1), "stakeToFeeDistributor");

        //     await logGas(await ctx.NFTProxy.methods.stakeToFeeDistributor(
        //         feeAddress,
        //         decimalStr("20"),
        //         0
        //     ), ctx.sendParam(user2), "stakeToFeeDistributor");

        //     let globalObj = await getFeeGlobalState(ctx, feeAddress, fragInstance, ctx.USDT, fragInstance);
        //     assert(globalObj['quoteBalance'], mweiStr("0.6"));
        //     assert(globalObj['stakeReserve'], decimalStr("45"));

        //     let user1Obj = await getFeeUserState(ctx, feeAddress, user1);
        //     assert(user1Obj['userQuoteRewards'], mweiStr("0.1"));
        //     assert(user1Obj['userShares'], decimalStr("15"));
        //     let user2Obj = await getFeeUserState(ctx, feeAddress, user2);
        //     assert(user2Obj['userBaseRewards'], decimalStr("0.66666480000453957"));
        //     assert(user2Obj['userShares'], decimalStr("30"));

        //     //claim
        //     var user1BaseBalanceStart = await fragInstance.methods.balanceOf(user1).call()
        //     await logGas(await nftFeeInstance.methods.claim(user1), ctx.sendParam(user1), "claim");
        //     var user1BaseBalanceEnd = await fragInstance.methods.balanceOf(user1).call()
        //     user1Obj = await getFeeUserState(ctx, feeAddress, user1);
        //     await getFeeGlobalState(ctx, feeAddress, fragInstance, ctx.USDT, fragInstance);
        //     assert(user1Obj['userQuoteRewards'], "0");
        //     assert(globalObj['quoteBalance'], mweiStr("0.5"));
        //     assert(user1BaseBalanceEnd - user1BaseBalanceStart, "333332400002269700");

        //     //unstake
        //     var user2BaseBalanceStart = await fragInstance.methods.balanceOf(user2).call()
        //     await logGas(await nftFeeInstance.methods.unstake(decimalStr("30"), user2, true), ctx.sendParam(user2), "unstake");
        //     var user2BaseBalanceEnd = await fragInstance.methods.balanceOf(user2).call()
        //     user2Obj = await getFeeUserState(ctx, feeAddress, user2);
        //     await getFeeGlobalState(ctx, feeAddress, fragInstance, ctx.USDT, fragInstance);
        //     assert(user2Obj['userQuoteRewards'], "0");
        //     assert(globalObj['quoteBalance'], mweiStr("0.3"));
        //     assert(globalObj['stakeReserve'], mweiStr("15"));
        //     assert(globalObj['stakeBalance'], mweiStr("15"));
        //     assert(user2BaseBalanceEnd - user2BaseBalanceStart, "30666664800004540000");
        // });

        it("buyout and redeem", async () => {
            var fragParams = [
                decimalStr("10000"), //totalSupply
                decimalStr("0.2"), //ownerRatio
                Math.floor(new Date().getTime() / 1000), //buyoutTimeStamp
                decimalStr("0")
            ]
            let [vaultAddress, fragAddress, , dvmAddress] = await ctx.createFragment(ctx, author, null, fragParams, null);
            var dvmInstance = contracts.getContractWithAddress(contracts.DVM_NAME, dvmAddress);
            var fragInstance = contracts.getContractWithAddress(contracts.NFT_FRAG, fragAddress);
            var vaultInstance = contracts.getContractWithAddress(contracts.NFT_VAULT, vaultAddress);

            await mockTrade(ctx, dvmAddress, dvmInstance, fragInstance);

            await fragInstance.methods.transfer(buyer, decimalStr("1002")).send(ctx.sendParam(author));

            await getUserBalance(author, fragInstance, ctx.USDT, "Author Before");
            await getUserBalance(buyer, fragInstance, ctx.USDT, "Buyer Before");
            await getUserBalance(dvmAddress, fragInstance, ctx.USDT, "DVM Before");
            await getUserBalance(fragAddress, fragInstance, ctx.USDT, "FRAG Before");

            var requireQuote = await fragInstance.methods.getBuyoutRequirement().call();
            await logGas(await ctx.NFTProxy.methods.buyout(fragAddress, requireQuote, 0, Math.floor(new Date().getTime() / 1000 + 60 * 10)), ctx.sendParam(buyer), "buyout");

            let [authorFrag, authorQuote] = await getUserBalance(author, fragInstance, ctx.USDT, "Author After");
            await getUserBalance(buyer, fragInstance, ctx.USDT, "Buyer After");
            await getUserBalance(dvmAddress, fragInstance, ctx.USDT, "DVM After");
            await getUserBalance(fragAddress, fragInstance, ctx.USDT, "FRAG After");
            // assert(authorQuote, "2034932000");
            assert(authorQuote, "10174055148");
            assert(authorFrag, "0");

            var vaultNewOwner = await vaultInstance.methods._OWNER_().call();
            assert(vaultNewOwner, buyer);

            await getUserBalance(user1, fragInstance, ctx.USDT, "User1 Redeem Before");
            await getUserBalance(user2, fragInstance, ctx.USDT, "User2 Redeem Before");

            await logGas(await fragInstance.methods.redeem(user1, "0x"), ctx.sendParam(user1), "redeem");
            await logGas(await fragInstance.methods.redeem(user2, "0x"), ctx.sendParam(user2), "redeem");

            let [user1Frag, user1Quote] = await getUserBalance(user1, fragInstance, ctx.USDT, "User1 Redeem After");
            await getUserBalance(user2, fragInstance, ctx.USDT, "User2 Redeem After");
            await getUserBalance(fragAddress, fragInstance, ctx.USDT, "FRAG Redeem After");
            assert(user1Quote, "99998580370")
            assert(user1Frag, "0")
        });

        it("withdrawNFTFromVault", async () => {
            var erc721Address = await ctx.createERC721(ctx, author);
            var erc1155Address = await ctx.createERC1155(ctx, author,100);
            var vaultAddress = await ctx.createNFTVault(ctx, author);
            var nftVaultInstance = contracts.getContractWithAddress(contracts.NFT_VAULT, vaultAddress);
            var erc721Instance = contracts.getContractWithAddress(contracts.ERC721, erc721Address);
            var erc1155Instance = contracts.getContractWithAddress(contracts.ERC1155, erc1155Address);
            await erc721Instance.methods.safeTransferFrom(author, vaultAddress, 0).send(ctx.sendParam(author));
            await erc1155Instance.methods.safeTransferFrom(author, vaultAddress, 0, 100, "0x").send(ctx.sendParam(author));
            // var nftIndex = await nftVaultInstance.methods.getIdByTokenIdAndAddr(erc721Address, 0).call();
            // var nftInfo = await nftVaultInstance.methods.getNftInfoById(nftIndex).call();
            // assert(nftInfo.amount, '1')
            // assert(nftInfo.tokenId, '0')

            // nftIndex = await nftVaultInstance.methods.getIdByTokenIdAndAddr(erc1155Address, 0).call();
            // nftInfo = await nftVaultInstance.methods.getNftInfoById(nftIndex).call();
            // assert(nftInfo.amount, '100')
            // assert(nftInfo.tokenId, '0')

            await logGas(await nftVaultInstance.methods.withdrawERC721(erc721Address,[0]), ctx.sendParam(author), "withdrawERC721");
            await logGas(await nftVaultInstance.methods.withdrawERC1155(erc1155Address,[0], [50]), ctx.sendParam(author), "withdrawERC1155");

            // await truffleAssert.reverts(
            //     nftVaultInstance.methods.getIdByTokenIdAndAddr(erc721Address, 0).call(),
            //     "TOKEN_ID_NOT_FOUND"
            // )

            // nftIndex = await nftVaultInstance.methods.getIdByTokenIdAndAddr(erc1155Address, 0).call();
            // nftInfo = await nftVaultInstance.methods.getNftInfoById(nftIndex).call();
            // assert(nftInfo.amount, '50')
            // assert(nftInfo.tokenId, '0')
        });
    });
});
