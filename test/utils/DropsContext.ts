/*

    Copyright 2021 DODO ZOO.
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


export class DropsContext {
    EVM: EVM;
    Web3: Web3;

    DropsV2: Contract;
    DropsERC721: Contract;
    DropsERC1155: Contract;
    DropsFeeModel: Contract;

    DropsProxy: Contract;
    DODOApprove: Contract;
    DODOApproveProxy: Contract;

    //token
    DODO: Contract;

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

        this.DODO = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["DODO Token", "DODO", 18]
        );

        this.DropsFeeModel = await contracts.newContract(
            contracts.DROPS_FEE_MODEL
        )

        await this.DropsFeeModel.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));

        this.DropsERC721 = await contracts.newContract(
            contracts.DROPS_ERC721
        )

        await this.DropsERC721.methods.init(this.Deployer, "","","").send(this.sendParam(this.Deployer));


        this.DropsERC1155 = await contracts.newContract(
            contracts.DROPS_ERC1155
        )
        
        await this.DropsERC1155.methods.init(this.Deployer, "").send(this.sendParam(this.Deployer));

        this.DODOApprove = await contracts.newContract(
            contracts.SMART_APPROVE
        );

        this.DODOApproveProxy = await contracts.newContract(
            contracts.SMART_APPROVE_PROXY,
            [this.DODOApprove.options.address]
        )

        this.DropsProxy = await contracts.newContract(contracts.DROPS_PROXY,
            [
                this.DODOApproveProxy.options.address
            ]
        )

        this.DropsV2 = await contracts.newContract(
            contracts.DROPS_V2
        );

        await this.DropsERC721.methods.addMintAccount(this.DropsV2.options.address).send(this.sendParam(this.Deployer));
        await this.DropsERC1155.methods.addMintAccount(this.DropsV2.options.address).send(this.sendParam(this.Deployer));

        await this.DODOApprove.methods.init(this.Deployer, this.DODOApproveProxy.options.address).send(this.sendParam(this.Deployer));
        await this.DODOApproveProxy.methods.init(this.Deployer, [this.DropsProxy.options.address]).send(this.sendParam(this.Deployer));

        console.log(log.blueText("[Init DODODrops context]"));
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

    async approveProxy(token: Contract, account: string) {
        await token.methods
            .approve(this.DODOApprove.options.address, MAX_UINT256)
            .send(this.sendParam(account));
    }
}

export async function getDropsContext(): Promise<DropsContext> {
    var context = new DropsContext();
    await context.init();
    return context;
}
