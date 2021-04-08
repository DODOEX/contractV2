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

    async approveProxy(account: string) {
        await this.USDT.methods
            .approve(this.DODOApprove.options.address, MAX_UINT256)
            .send(this.sendParam(account));
        await this.WETH.methods
            .approve(this.DODOApprove.options.address, MAX_UINT256)
            .send(this.sendParam(account));
    }
}

export async function getDODONftContext(weth: string): Promise<NFTContext> {
    var context = new NFTContext();
    await context.init(weth);
    return context;
}
