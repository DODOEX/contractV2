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


export class DODOStarterContext {
    EVM: EVM;
    Web3: Web3;

    //contract
    DODOStarterFactory: Contract;

    //account
    Deployer: string;
    Maintainer: string;
    SpareAccounts: string[];

    //token
    SellToken: Contract;
    FundToken: Contract;


    async init() {
        this.EVM = new EVM();
        this.Web3 = getDefaultWeb3();

        const allAccounts = await this.Web3.eth.getAccounts();
        this.Deployer = allAccounts[0];
        this.Maintainer = allAccounts[1];
        this.SpareAccounts = allAccounts.slice(2, 10);

        this.SellToken = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["SellToken", "DODO", 18]
        );

        this.FundToken = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["FundToken", "USDT", 18]
        );

        let cloneFactory = await contracts.newContract(
            contracts.CLONE_FACTORY_CONTRACT_NAME
        );

        let fairFundingTemplate = await contracts.newContract(
            contracts.FAIR_FUNDING
        )

        let instantFundingTemplate = await contracts.newContract(
            contracts.INSTANT_FUNDING
        )

        this.DODOStarterFactory = await contracts.newContract(contracts.DODO_STARTER_FACTORY,
            [
                cloneFactory.options.address,
                fairFundingTemplate.options.address,
                instantFundingTemplate.options.address
            ]
        )

        await this.DODOStarterFactory.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));

        console.log(log.blueText("[Init DODOStarter context]"));
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

    async approveProxy(account: string, target: string, token: Contract) {
        await token.methods
            .approve(target, MAX_UINT256)
            .send(this.sendParam(account));
    }
}

export async function getDODOStarterContext(): Promise<DODOStarterContext> {
    var context = new DODOStarterContext();
    await context.init();
    return context;
}