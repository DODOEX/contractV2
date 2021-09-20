/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import * as contracts from './Contracts';
import { decimalStr, mweiStr } from './Converter';
import { EVM, getDefaultWeb3 } from './EVM';
import * as log from './Log';

BigNumber.config({
    EXPONENTIAL_AT: 1000,
    DECIMAL_PLACES: 80,
});


export class NFTPoolContext {
    EVM: EVM;
    Web3: Web3;

    FilterAdmin: Contract;
    FilterERC721V1: Contract;
    FilterERC1155V1: Contract;
    Controller: Contract;
    DODONFTApprove: Contract;
    DODONFTPoolProxy: Contract;

    //nft token
    DodoNft: Contract;
    DodoNft1155: Contract;

    Deployer: string;
    Maintainer: string;
    SpareAccounts: string[];

    constructor() { }

    async init() {
        this.EVM = new EVM();
        this.Web3 = getDefaultWeb3();
        const allAccounts = await this.Web3.eth.getAccounts();
        this.Deployer = allAccounts[0];
        this.Maintainer = allAccounts[1];
        this.SpareAccounts = allAccounts.slice(2, 10);


        this.DodoNft = await contracts.newContract(contracts.DODO_NFT);
        this.DodoNft1155 = await contracts.newContract(contracts.DODO_NFT_1155);

        await this.DodoNft.methods.init(this.Deployer, "DODONFT", "DODONFT").send(this.sendParam(this.Deployer));
        await this.DodoNft1155.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));
        
        var cloneFactory = await contracts.newContract(
            contracts.CLONE_FACTORY_CONTRACT_NAME
        );
        var filterAdminTemplate = await contracts.newContract(contracts.FILTER_ADMIN)
        var filterERC721V1Template = await contracts.newContract(contracts.FILTER_ERC721_V1)
        var filterERC1155V1Template = await contracts.newContract(contracts.FILTER_ERC1155_V1)
        
        this.Controller = await contracts.newContract(contracts.CONTROLLER)
        await this.Controller.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));

        this.DODONFTApprove = await contracts.newContract(
            contracts.DODO_NFT_APPROVE
        );

        this.DODONFTPoolProxy = await contracts.newContract(contracts.DODO_NFT_POOL_PROXY,
            [
                cloneFactory.options.address,
                filterAdminTemplate.options.address,
                this.Controller.options.address,
                this.Deployer,
                this.DODONFTApprove.options.address,
                "0x0000000000000000000000000000000000000000" //TODO:ERC721 => ERC20 DODOApprove
            ]
        )

        await this.DODONFTPoolProxy.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));
        await this.DODONFTPoolProxy.methods.setFilterTemplate(1, filterERC721V1Template.options.address).send(this.sendParam(this.Deployer));
        await this.DODONFTPoolProxy.methods.setFilterTemplate(2, filterERC1155V1Template.options.address).send(this.sendParam(this.Deployer));

        await this.DODONFTApprove.methods.init(this.Deployer, [this.DODONFTPoolProxy.options.address]).send(this.sendParam(this.Deployer));

        console.log(log.blueText("[Init NFTPool context]"));
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
}

export async function getNFTPoolContext(): Promise<NFTPoolContext> {
    var context = new NFTPoolContext();
    await context.init();
    return context;
}
