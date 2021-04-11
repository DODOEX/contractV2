/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import * as contracts from './Contracts';
import { decimalStr, mweiStr, MAX_UINT256 } from './Converter';
import { EVM, getDefaultWeb3 } from './EVM';
import * as log from './Log';

BigNumber.config({
    EXPONENTIAL_AT: 1000,
    DECIMAL_PLACES: 80,
});


export class NFTContext {
    EVM: EVM;
    Web3: Web3;
    NFTTokenFacotry: Contract;

    NFTRegister: Contract;
    CollatteralVault: Contract;
    Fragment: Contract;
    NFTFee: Contract;

    NFTProxy: Contract;
    DODOApprove: Contract;
    DODOApproveProxy: Contract;

    //token
    USDT: Contract;
    WETH: Contract;
    DODO: Contract;

    Deployer: string;
    Maintainer: string;
    SpareAccounts: string[];

    constructor() { }

    async init(weth: string) {
        this.EVM = new EVM();
        this.Web3 = getDefaultWeb3();
        const allAccounts = await this.Web3.eth.getAccounts();
        this.Deployer = allAccounts[0];
        this.Maintainer = allAccounts[1];
        this.SpareAccounts = allAccounts.slice(2, 10);

        this.WETH = contracts.getContractWithAddress(contracts.WETH_CONTRACT_NAME, weth);

        this.USDT = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["USDT Token", "USDT", 6]
        );

        this.DODO = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["DODO Token", "DODO", 6]
        );

        var cloneFactory = await contracts.newContract(
            contracts.CLONE_FACTORY_CONTRACT_NAME
        );
        var dvmTemplate = await contracts.newContract(contracts.DVM_NAME)
        var constFeeTemplate = await contracts.newContract(contracts.CONST_FEE_RATE_MODEL_NAME)

        var ERC721Template = await contracts.newContract(contracts.ERC721)
        var ERC1155Template = await contracts.newContract(contracts.ERC1155)


        this.NFTTokenFacotry = await contracts.newContract(contracts.NFT_TOKEN_FACTORY,
            [
                cloneFactory.options.address,
                ERC721Template.options.address,
                ERC1155Template.options.address
            ]
        )

        this.DODOApprove = await contracts.newContract(
            contracts.SMART_APPROVE
        );

        this.DODOApproveProxy = await contracts.newContract(
            contracts.SMART_APPROVE_PROXY,
            [this.DODOApprove.options.address]
        )


        this.NFTRegister = await contracts.newContract(contracts.NFT_REGISTER)
        await this.NFTRegister.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));


        this.CollatteralVault = await contracts.newContract(
            contracts.NFT_VAULT
        );

        this.Fragment = await contracts.newContract(contracts.NFT_FRAG)

        this.NFTFee = await contracts.newContract(contracts.NFT_FEE)

        this.NFTProxy = await contracts.newContract(contracts.NFT_PROXY,
            [
                cloneFactory.options.address,
                this.WETH.options.address,
                this.DODOApproveProxy.options.address,
                this.Deployer,
                this.CollatteralVault.options.address,
                this.Fragment.options.address,
                this.NFTFee.options.address,
                dvmTemplate.options.address,
                constFeeTemplate.options.address,
                this.NFTRegister.options.address
            ]
        )

        await this.NFTProxy.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));

        await this.NFTRegister.methods.addAmindList(this.NFTProxy.options.address).send(this.sendParam(this.Deployer));


        await this.DODOApprove.methods.init(this.Deployer, this.DODOApproveProxy.options.address).send(this.sendParam(this.Deployer));
        await this.DODOApproveProxy.methods.init(this.Deployer, [this.NFTProxy.options.address]).send(this.sendParam(this.Deployer));

        console.log(log.blueText("[Init DODONFT context]"));
    }

    sendParam(sender, value = "0") {
        return {
            from: sender,
            gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
            gasPrice: mweiStr("1000"),
            value: decimalStr(value),
        };
    }

    async mintTestToken(to: string, token: Contract, amount: string) {
        await token.methods.mint(to, amount).send(this.sendParam(this.Deployer));
    }

    async approveProxy(token, account: string) {
        await token.methods
            .approve(this.DODOApprove.options.address, MAX_UINT256)
            .send(this.sendParam(account));
    }

    async getRegistry(ctx: NFTContext, vaultAddress: string) {
        let fragAddress = await ctx.NFTRegister.methods._VAULT_FRAG_REGISTRY_(vaultAddress).call();
        let feeDistrubitor = await ctx.NFTRegister.methods._FRAG_FEE_REGISTRY_(fragAddress).call();
        let fragInstance = contracts.getContractWithAddress(contracts.NFT_FRAG, fragAddress);
        let dvmAddress = await fragInstance.methods._DVM_().call();
        return [fragAddress, feeDistrubitor, dvmAddress];
    }

    async createNFTVault(ctx: NFTContext, author: string) {
        var tx = await ctx.NFTProxy.methods.createNFTCollateralVault(
            "DODONFT",
            "https://app.dodoex.io"
        ).send(ctx.sendParam(author));

        return tx.events['CreateNFTCollateralVault']['returnValues']['vault'];
    }

    async createERC721(ctx: NFTContext, author: string) {
        var tx = await ctx.NFTTokenFacotry.methods.createERC721(
            "https://app.dodoex.io"
        ).send(ctx.sendParam(author));
        return tx.events['NewERC721']['returnValues']['erc721'];
    }

    async createFragment(ctx: NFTContext, author: string, dvmParams, fragParams, addrs) {
        var erc721Address = await this.createERC721(ctx, author);
        var vaultAddress = await this.createNFTVault(ctx, author);
        var nftVaultInstance = contracts.getContractWithAddress(contracts.NFT_VAULT, vaultAddress);
        var erc721Instance = contracts.getContractWithAddress(contracts.ERC721, erc721Address);
        await erc721Instance.methods.safeTransferFrom(author, vaultAddress,0).send(ctx.sendParam(author));
        if (dvmParams == null) {
            dvmParams = [
                "0", //lpFeeRate
                decimalStr("0.01"), //mtFeeRate
                mweiStr("1"), // I
                decimalStr("1") // K
            ];
        }
        if (fragParams == null) {
            fragParams = [
                decimalStr("100000000"), //totalSupply
                decimalStr("0.2"), //ownerRatio
                Math.floor(new Date().getTime() / 1000 + 60 * 60) //buyoutTimeStamp 1h later
            ]
        }
        if (addrs == null) {
            addrs = []
            addrs.push(ctx.USDT.options.address);//quoteToken
            addrs.push(author);//vaultPreOwner
            addrs.push("0x0000000000000000000000000000000000000000");//stakeToken
        }

        var callData = ctx.NFTProxy.methods.createFragment(
            addrs[0],
            addrs[1],
            addrs[2],
            dvmParams,
            fragParams,
            false
        ).encodeABI();

        await nftVaultInstance.methods.createFragment(
            ctx.NFTProxy.options.address,
            callData
        ).send(ctx.sendParam(author));

        let [fragAddress, feeAddress, dvmAddress] = await this.getRegistry(ctx, vaultAddress);
        return [vaultAddress, fragAddress, feeAddress, dvmAddress, callData]
    }


    async transferBaseToDVM(baseToken, dvm: string, account: string, amount: string) {
        await baseToken.methods.transfer(dvm, amount).send(this.sendParam(account))
    }

    async transferQuoteToDVM(quoteToken, dvm: string, account: string, amount: string) {
        await quoteToken.methods.transfer(dvm, amount).send(this.sendParam(account))
    }

}

export async function getDODONftContext(weth: string): Promise<NFTContext> {
    var context = new NFTContext();
    await context.init(weth);
    return context;
}
