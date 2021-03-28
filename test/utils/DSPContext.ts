/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import * as contracts from './Contracts';
import { decimalStr, MAX_UINT256 } from './Converter';
import { EVM, getDefaultWeb3 } from './EVM';
import * as log from './Log';

BigNumber.config({
    EXPONENTIAL_AT: 1000,
    DECIMAL_PLACES: 80,
});

export interface DSPContextBalances {
    traderBase: string,
    traderQuote: string,
    DPPBase: string,
    DPPQuote: string,
    maintainerBase: string,
    maintainerQuote: string
}

export interface DSPContextInitConfig {
    lpFeeRate: string;
    mtFeeRate: string;
    k: string;
    i: string;
}

/*
  price curve when k=0.1
  +──────────────────────+───────────────+
  | purchase percentage  | avg slippage  |
  +──────────────────────+───────────────+
  | 1%                   | 0.1%         |
  | 5%                   | 0.5%         |
  | 10%                  | 1.1%         |
  | 20%                  | 2.5%         |
  | 50%                  | 10%          |
  | 70%                  | 23.3%        |
  +──────────────────────+───────────────+
*/
export let DefaultDSPContextInitConfig = {
    lpFeeRate: decimalStr("0.002"),
    mtFeeRate: decimalStr("0.001"),
    k: decimalStr("0.1"),
    i: decimalStr("1"),
};

export class DSPContext {
    EVM: EVM;
    Web3: Web3;
    DSP: Contract;
    BASE: Contract;
    QUOTE: Contract;
    Deployer: string;
    Maintainer: string;
    MtFeeRate: string;
    SpareAccounts: string[];

    mtFeeRateModel: Contract;


    constructor() { }

    async init(config: DVMContextInitConfig) {
        this.EVM = new EVM();
        this.Web3 = getDefaultWeb3();

        this.DSP = await contracts.newContract(contracts.DSP_NAME)
        var mtFeeRateModel = await contracts.newContract(contracts.FEE_RATE_MODEL_NAME)
        this.mtFeeRateModel = mtFeeRateModel;
        this.MtFeeRate = mtFeeRateModel.options.address

        this.BASE = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["TestBase", "BASE", 18]
        );
        this.QUOTE = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["TestQuote", "QUOTE", 18]
        );

        const allAccounts = await this.Web3.eth.getAccounts();
        this.Deployer = allAccounts[0];
        this.Maintainer = allAccounts[1];
        this.SpareAccounts = allAccounts.slice(2, 10);

        await this.DSP.methods.init(
            this.Maintainer,
            this.BASE.options.address,
            this.QUOTE.options.address,
            0,
            mtFeeRateModel.options.address,
            config.i,
            config.k,
            true
        ).send(this.sendParam(this.Deployer))

        console.log(log.blueText("[Init DSP context]"));
    }

    sendParam(sender, value = "0") {
        return {
            from: sender,
            gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
            gasPrice: process.env.GAS_PRICE,
            value: decimalStr(value),
        };
    }

    async mintTestToken(to: string, base: string, quote: string) {
        await this.BASE.methods.mint(to, base).send(this.sendParam(this.Deployer));
        await this.QUOTE.methods
            .mint(to, quote)
            .send(this.sendParam(this.Deployer));
    }

    async transferBaseToDSP(account: string, amount: string) {
        await this.BASE.methods.transfer(this.DSP.options.address, amount).send(this.sendParam(account))
    }

    async transferQuoteToDSP(account: string, amount: string) {
        await this.QUOTE.methods.transfer(this.DSP.options.address, amount).send(this.sendParam(account))
    }

    async getBalances(trader: string) {
        var balances: DSPContextBalances = {
            traderBase: await this.BASE.methods.balanceOf(trader).call(),
            traderQuote: await this.QUOTE.methods.balanceOf(trader).call(),
            DPPBase: await this.BASE.methods.balanceOf(this.DSP.options.address).call(),
            DPPQuote: await this.QUOTE.methods.balanceOf(this.DSP.options.address).call(),
            maintainerBase: await this.BASE.methods.balanceOf(this.Maintainer).call(),
            maintainerQuote: await this.QUOTE.methods.balanceOf(this.Maintainer).call()
        };
        return balances;
    }
}

export async function getDSPContext(
    config: DSPContextInitConfig = DefaultDSPContextInitConfig
): Promise<DSPContext> {
    var context = new DSPContext();
    await context.init(config);
    return context;
}
