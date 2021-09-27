/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// import * as assert from 'assert';

import { decimalStr, MAX_UINT256 } from '../utils/Converter';
import { logGas } from '../utils/Log';
import { NFTPoolContext, getNFTPoolContext } from '../utils/NFTPoolContext';
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

async function createNFTPool(ctx: NFTPoolContext) {
    var tx = await logGas(ctx.DODONFTPoolProxy.methods.createNewNFTPoolV1(
        maker,
        ctx.DodoNft.options.address,
        1,
        ['Filter01', 'FRAG', 'FRAG'],
        [decimalStr("10000000"), decimalStr("0.005")],
        [true, true, true],
        [0, 4, 5, 1],
        [decimalStr("1"), decimalStr("0.9"), decimalStr("1"), decimalStr("0.9"), decimalStr("2"), decimalStr("0.9")],
        [7]
    ), ctx.sendParam(maker), "createNewNFTPoolV1");

    var newFilterAdmin = tx.events['CreateNFTPool'].returnValues['newFilterAdmin']
    var filter = tx.events['CreateNFTPool'].returnValues['filter']

    return [newFilterAdmin, filter];
}

async function mintNFT(ctx: NFTPoolContext) {
    var tx = await ctx.DodoNft.methods.mint(
        "http://projectowen.oss-cn-beijing.aliyuncs.com/2021-09-19-035145.png"
    ).send(ctx.sendParam(user));

    var tokenId = tx.events['DODONFTMint'].returnValues['tokenId']
    return tokenId
}

async function erc721In(ctx: NFTPoolContext) {
    var [filterAdmin, filter] = await createNFTPool(ctx)
    var tokenIds = []
    for (var i = 0; i < 5; i++) {
        var curTokenId = await mintNFT(ctx);
        tokenIds.push(curTokenId);
    }

    await ctx.DodoNft.methods.setApprovalForAll(
        ctx.DODONFTApprove.options.address,
        true
    ).send(ctx.sendParam(user))

    await ctx.DODONFTPoolProxy.methods.erc721In(
        filter,
        ctx.DodoNft.options.address,
        tokenIds,
        user,
        1
    ).send(ctx.sendParam(user));

    return [filterAdmin, filter]
}

describe("ERC721-NFTPool", () => {
    let snapshotId: string;
    let ctx: NFTPoolContext;

    before(async () => {
        ctx = await getNFTPoolContext();
        await init(ctx);
    });

    beforeEach(async () => {
        snapshotId = await ctx.EVM.snapshot();
    });

    afterEach(async () => {
        await ctx.EVM.reset(snapshotId);
    });

    describe("ERC721-NFTPool", () => {

        it("createNewNFTPoolV1", async () => {
            var tx = await logGas(ctx.DODONFTPoolProxy.methods.createNewNFTPoolV1(
                maker,
                ctx.DodoNft.options.address,
                1,
                ['Filter01', 'FRAG', 'FRAG'],
                [decimalStr("10000000"), decimalStr("0.005")],
                [true, true, true],
                [0, 3, 2, 1],
                [decimalStr("1"), decimalStr("1.1"), decimalStr("1"), decimalStr("1.1"), decimalStr("2"), decimalStr("1.1")],
                [5]
            ), ctx.sendParam(maker), "createNewNFTPoolV1");

            var newFilterAdmin = tx.events['CreateNFTPool'].returnValues['newFilterAdmin']
            var filter = tx.events['CreateNFTPool'].returnValues['filter']

            console.log("newFilterAdmin:", newFilterAdmin)
            console.log("filterV1:", filter)

            assert.equal(
                tx.events['CreateNFTPool'].returnValues['filterAdminOwner'],
                maker
            )
        });

        it('erc721In', async () => {
            var [filterAdmin, filter] = await createNFTPool(ctx)
            var tokenIds = []
            for (var i = 0; i < 4; i++) {
                var curTokenId = await mintNFT(ctx);
                tokenIds.push(curTokenId);
            }

            await logGas(ctx.DodoNft.methods.setApprovalForAll(
                ctx.DODONFTApprove.options.address,
                true
            ), ctx.sendParam(user), "ApproveNFT");

            var filterAdminInstance = contracts.getContractWithAddress(contracts.FILTER_ADMIN, filterAdmin);

            var beforeBalance = await filterAdminInstance.methods.balanceOf(user).call();
            console.log("beforeBalance:", beforeBalance);

            var tx = await logGas(ctx.DODONFTPoolProxy.methods.erc721In(
                filter,
                ctx.DodoNft.options.address,
                tokenIds,
                user,
                1
            ), ctx.sendParam(user), "erc721In");

            var afterBalance = await filterAdminInstance.methods.balanceOf(user).call();
            console.log("afterBalance:", afterBalance);

            assert.equal(
                tx.events['Erc721In'].returnValues['received'],
                '3421805000000000000'
            )
        })

        it('ERC721TargetOut', async () => {
            var [, filter] = await erc721In(ctx);

            var filterInstance = contracts.getContractWithAddress(contracts.FILTER_ERC721_V1, filter);

            var beforeOwner = await ctx.DodoNft.methods.ownerOf(0).call();
            assert.equal(beforeOwner, filter)

            //maker targetout
            var tx = await logGas(filterInstance.methods.ERC721TargetOut(
                [0, 1, 3],
                maker,
                MAX_UINT256,
            ), ctx.sendParam(maker), "Erc721TargetOut");

            var paid = tx.events['TargetOutOrder'].returnValues['paidAmount']

            assert.equal(paid, "4412151000000000000");

            var maxNftOutAmount = await filterInstance.methods.getAvaliableNFTOutAmount().call();
            var totalNftAmount = await filterInstance.methods._TOTAL_NFT_AMOUNT_().call();
            var tokenId2 = await filterInstance.methods.getNFTIndexById(2).call();

            assert.equal(maxNftOutAmount, 1);
            assert.equal(totalNftAmount, 2);
            assert.equal(tokenId2, 1);

            var afterOwner = await ctx.DodoNft.methods.ownerOf(0).call();
            assert.equal(afterOwner, maker)
        })


        it('ERC721RandomOut', async () => {
            var [, filter] = await erc721In(ctx);

            var filterInstance = contracts.getContractWithAddress(contracts.FILTER_ERC721_V1, filter);

            //maker randomOut
            var tx = await logGas(filterInstance.methods.ERC721RandomOut(
                3,
                maker,
                MAX_UINT256,
            ), ctx.sendParam(maker), "Erc721RandomOut");

            var paid = tx.events['RandomOutOrder'].returnValues['paidAmount']
            assert.equal(paid, "2206075500000000000");

            var maxNftOutAmount = await filterInstance.methods.getAvaliableNFTOutAmount().call();
            var totalNftAmount = await filterInstance.methods._TOTAL_NFT_AMOUNT_().call();

            assert.equal(maxNftOutAmount, 1);
            assert.equal(totalNftAmount, 2);
        })

        it('emergencyWithdraw', async () => {
            var [filterAdmin, filter] = await erc721In(ctx);
            await ctx.Controller.methods.setEmergencyWithdraw(filter, true).send(ctx.sendParam(ctx.Deployer));

            var beforeOwner = await ctx.DodoNft.methods.ownerOf(0).call();
            assert.equal(beforeOwner, filter)

            var filterInstance = contracts.getContractWithAddress(contracts.FILTER_ERC721_V1, filter);

            await logGas(filterInstance.methods.emergencyWithdraw(
                [ctx.DodoNft.options.address, ctx.DodoNft.options.address, ctx.DodoNft.options.address],
                [0, 1, 4],
                maker
            ), ctx.sendParam(maker), "EmergencyWithdraw")


            var afterOwner = await ctx.DodoNft.methods.ownerOf(0).call();
            assert.equal(afterOwner, maker)

            var maxNftOutAmount = await filterInstance.methods.getAvaliableNFTOutAmount().call();
            var totalNftAmount = await filterInstance.methods._TOTAL_NFT_AMOUNT_().call();
            
            assert.equal(maxNftOutAmount, 1);
            assert.equal(totalNftAmount, 2);
        })
    });
});

