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


export class DODOMineV2Context {
    EVM: EVM;
    Web3: Web3;

    //contract
    ERC20Mine: Contract;

    //account
    Deployer: string;
    Maintainer: string;
    SpareAccounts: string[];

    //token
    REWARD_1: Contract;
    REWARD_2: Contract;
    ERC20: Contract;


    async init() {
        this.EVM = new EVM();
        this.Web3 = getDefaultWeb3();

        const allAccounts = await this.Web3.eth.getAccounts();
        this.Deployer = allAccounts[0];
        this.Maintainer = allAccounts[1];
        this.SpareAccounts = allAccounts.slice(2, 10);

        this.ERC20 = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["ERC20 Token", "ERC20", 18]
        );

        this.REWARD_1 = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["REWARD_1 Token", "REWARD_1", 18]
        );

        this.REWARD_2 = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["REWARD_2 Token", "REWARD_2", 18]
        );

        this.ERC20Mine = await contracts.newContract(
            contracts.ERC20_MINE,
            [this.ERC20.options.address]
        );

        await this.ERC20Mine.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));

        console.log(log.blueText("[Init ERC20Mine context]"));
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

export async function getDODOMineContext(): Promise<DODOMineV2Context> {
    var context = new DODOMineV2Context();
    await context.init();
    return context;
}