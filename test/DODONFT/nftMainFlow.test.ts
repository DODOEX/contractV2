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

async function createNFTVault(ctx: NFTContext) {
    var tx = await ctx.NFTProxy.methods.createNFTCollateralVault(
        "DODONFT",
        "https://app.dodoex.io"
    ).send(ctx.sendParam(author));

    return tx.events['CreateNFTCollateralVault']['returnValues']['vault'];
}

async function createERC721(ctx:NFTContext) {
    var tx = await ctx.NFTTokenFacotry.methods.createERC721(
        "https://app.dodoex.io"
    ).send(ctx.sendParam(author));
    return tx.events['NewERC721']['returnValues']['erc721'];
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
            var erc721Address = await createERC721(ctx);
            var vaultAddress = await createNFTVault(ctx);
            var nftVaultInstance = contracts.getContractWithAddress(contracts.NFT_VAULT, vaultAddress);
            var erc721Instance = contracts.getContractWithAddress(contracts.ERC721, erc721Address);
            await erc721Instance.methods.safeTransferFrom(author, vaultAddress, 0).send(ctx.sendParam(author));
            var nftIndex = await nftVaultInstance.methods.getIdByTokenIdAndAddr(erc721Address,0).call();
            var nftInfo = await nftVaultInstance.methods.getNftInfoById(nftIndex).call();
            assert(nftInfo.amount, '1')
            assert(nftInfo.tokenId, '0')
        });

        it("createFragment", async () => {
            
        });

        it("stakeToFeeDistributor", async () => {

        });

        it("dvm-trade", async () => {

        });

        it("claim", async () => {

        });

        it("unstake", async () => {

        });

        it("buyout", async () => {

        });

        it("redeem", async () => {

        });

        it("withdrawNFTFromVault", async () => {

        });
    });
});
