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
        ctx.DodoNft1155.options.address,
        2,
        ['Filter01', 'FRAG', 'FRAG'],
        [decimalStr("10000000"), decimalStr("0.005")],
        [true, true, true],
        [0, 4, 12, 4],
        [decimalStr("1"), decimalStr("0.9"), decimalStr("1"), decimalStr("0.9"), decimalStr("2"), decimalStr("0.9")],
        [7]
    ), ctx.sendParam(maker), "createNewNFTPoolV1");

    var newFilterAdmin = tx.events['CreateNFTPool'].returnValues['newFilterAdmin']
    var filter = tx.events['CreateNFTPool'].returnValues['filter']

    return [newFilterAdmin, filter];
}

async function mintNFT(ctx: NFTPoolContext, amount) {
    var tx = await ctx.DodoNft1155.methods.mint(
        "http://projectowen.oss-cn-beijing.aliyuncs.com/2021-09-19-035145.png",
        amount
    ).send(ctx.sendParam(user));

    var tokenId = tx.events['DODONFTMint'].returnValues['tokenId']
    return tokenId
}

async function erc1155In(ctx: NFTPoolContext) {
    var [filterAdmin, filter] = await createNFTPool(ctx)
    var tokenIds = []
    var amounts = []
    for (var i = 0; i < 5; i++) {
        var curTokenId = await mintNFT(ctx, 2);
        tokenIds.push(curTokenId);
        amounts.push(2);
    }

    await ctx.DodoNft1155.methods.setApprovalForAll(
        ctx.DODONFTApprove.options.address,
        true
    ).send(ctx.sendParam(user))

    await ctx.DODONFTPoolProxy.methods.erc1155In(
        filter,
        ctx.DodoNft1155.options.address,
        tokenIds,
        amounts,
        user,
        1
    ).send(ctx.sendParam(user));

    return [filterAdmin, filter]
}

describe("ERC1155-NFTPool", () => {
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

    describe("ERC1155-NFTPool", () => {
        it('erc1155In', async () => {
            var [filterAdmin, filter] = await createNFTPool(ctx)
            var tokenIds = []
            var amounts = []
            for (var i = 0; i < 4; i++) {
                var curTokenId = await mintNFT(ctx, 2);
                tokenIds.push(curTokenId);
                amounts.push(2);
            }

            var beforeBalanceTokenId0 = await ctx.DodoNft1155.methods.balanceOf(filter, 0).call();
            assert.equal(beforeBalanceTokenId0, 0)

            await logGas(ctx.DodoNft1155.methods.setApprovalForAll(
                ctx.DODONFTApprove.options.address,
                true
            ), ctx.sendParam(user), "ApproveNFT");

            var filterAdminInstance = contracts.getContractWithAddress(contracts.FILTER_ADMIN, filterAdmin);

            var beforeBalance = await filterAdminInstance.methods.balanceOf(user).call();
            console.log("beforeBalance:", beforeBalance);

            var tx = await logGas(ctx.DODONFTPoolProxy.methods.erc1155In(
                filter,
                ctx.DodoNft1155.options.address,
                tokenIds,
                amounts,
                user,
                1
            ), ctx.sendParam(user), "erc1155In");


            assert.equal(
                tx.events['Erc1155In'].returnValues['received'],
                '5666851260500000000'
            )

            var afterBalanceTokenId0 = await ctx.DodoNft1155.methods.balanceOf(filter, 0).call();
            assert.equal(afterBalanceTokenId0, 2)

        })

        it('ERC1155TargetOut', async () => {
            var [, filter] = await erc1155In(ctx);

            var filterInstance = contracts.getContractWithAddress(contracts.FILTER_ERC1155_V1, filter);

            var beforeAmount = await ctx.DodoNft1155.methods.balanceOf(filter, 0).call();
            assert.equal(beforeAmount, 2)

            //maker targetout
            var tx = await logGas(filterInstance.methods.ERC1155TargetOut(
                [0, 1, 3],
                [2, 1, 1],
                maker,
                MAX_UINT256,
            ), ctx.sendParam(maker), "Erc1155TargetOut");

            var paid = tx.events['TargetOutOrder'].returnValues['paidAmount']
            assert.equal(paid, "3673527453990000000");

            var maxNftOutAmount = await filterInstance.methods.getAvaliableNFTOutAmount().call();
            var totalNftAmount = await filterInstance.methods._TOTAL_NFT_AMOUNT_().call();

            assert.equal(maxNftOutAmount, 2);
            assert.equal(totalNftAmount, 6);

            var afterAmount = await ctx.DodoNft1155.methods.balanceOf(maker, 0).call();
            assert.equal(afterAmount, 2)
        })


        it('ERC721RandomOut', async () => {
            var [, filter] = await erc1155In(ctx);

            var filterInstance = contracts.getContractWithAddress(contracts.FILTER_ERC1155_V1, filter);

            //maker randomOut
            var tx = await logGas(filterInstance.methods.ERC1155RandomOut(
                3,
                maker,
                MAX_UINT256,
            ), ctx.sendParam(maker), "Erc1155RandomOut");

            var paid = tx.events['RandomOutOrder'].returnValues['paidAmount']
            assert.equal(paid, "1302665521995000000");

            var maxNftOutAmount = await filterInstance.methods.getAvaliableNFTOutAmount().call();
            var totalNftAmount = await filterInstance.methods._TOTAL_NFT_AMOUNT_().call();

            assert.equal(maxNftOutAmount, 3);
            assert.equal(totalNftAmount, 7);
        })

        it('emergencyWithdraw', async () => {
            var [filterAdmin, filter] = await erc1155In(ctx);
            await ctx.Controller.methods.setEmergencyWithdraw(filter, true).send(ctx.sendParam(ctx.Deployer));

            var beforeAmount = await ctx.DodoNft1155.methods.balanceOf(filter, 0).call();
            assert.equal(beforeAmount, 2)

            var filterInstance = contracts.getContractWithAddress(contracts.FILTER_ERC1155_V1, filter);

            await logGas(filterInstance.methods.emergencyWithdraw(
                [ctx.DodoNft1155.options.address, ctx.DodoNft1155.options.address, ctx.DodoNft1155.options.address],
                [0, 1, 4],
                [1, 2, 2],
                maker
            ), ctx.sendParam(maker), "EmergencyWithdraw")


            var afterAmount = await ctx.DodoNft1155.methods.balanceOf(maker, 0).call();
            assert.equal(afterAmount, 1)
            afterAmount = await ctx.DodoNft1155.methods.balanceOf(filter, 0).call();
            assert.equal(afterAmount, 1)

            var maxNftOutAmount = await filterInstance.methods.getAvaliableNFTOutAmount().call();
            var totalNftAmount = await filterInstance.methods._TOTAL_NFT_AMOUNT_().call();

            assert.equal(maxNftOutAmount, 1);
            assert.equal(totalNftAmount, 5);
        })
    });
});

