/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import * as contracts from './Contracts';
import { decimalStr, gweiStr, MAX_UINT256 } from './Converter';
import { EVM, getDefaultWeb3 } from './EVM';
import * as log from './Log';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export interface DVMContextInitConfig {
  lpFeeRate: string;
  mtFeeRate: string;
  k: string;
  i: string;
  gasPriceLimit: string;
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
export let DefaultDVMContextInitConfig = {
  lpFeeRate: decimalStr("0.002"),
  mtFeeRate: decimalStr("0.001"),
  k: decimalStr("0.1"),
  i: decimalStr("100"),
  gasPriceLimit: gweiStr("100"),
};

export class DVMContext {
  EVM: EVM;
  Web3: Web3;
  Route: Contract;
  DVMFactory: Contract;
  DVM: Contract;
  Vault: Contract;
  BASE: Contract;
  QUOTE: Contract;
  Deployer: string;
  Maintainer: string;
  SpareAccounts: string[];

  constructor() { }

  async init(config: DVMContextInitConfig) {
    this.EVM = new EVM();
    this.Web3 = getDefaultWeb3();
    this.Route = await contracts.newContract(contracts.SMART_ROUTE_NAME)

    var cloneFactory = await contracts.newContract(
      contracts.CLONE_FACTORY_CONTRACT_NAME
    );
    var vaultTemplate = await contracts.newContract(contracts.DVM_VAULT_NAME)
    var controllerTemplate = await contracts.newContract(contracts.DVM_CONTROLLER_NAME)

    this.DVMFactory = await contracts.newContract(contracts.DVM_FACTORY_NAME, [cloneFactory.options.address, vaultTemplate.options.address, controllerTemplate.options.address])

    this.BASE = await contracts.newContract(
      contracts.TEST_ERC20_CONTRACT_NAME,
      ["TestBase", 18]
    );
    this.QUOTE = await contracts.newContract(
      contracts.TEST_ERC20_CONTRACT_NAME,
      ["TestQuote", 18]
    );

    const allAccounts = await this.Web3.eth.getAccounts();
    this.Deployer = allAccounts[0];
    this.Maintainer = allAccounts[1];
    this.SpareAccounts = allAccounts.slice(2, 10);

    var lpFeeRateModel = await contracts.newContract(contracts.NAIVE_FEE_RATE_MODEL_NAME, [config.lpFeeRate])
    var mtFeeRateModel = await contracts.newContract(contracts.NAIVE_FEE_RATE_MODEL_NAME, [config.mtFeeRate])
    var DVMAddress = this.DVMFactory.methods.createDODOVenderMachine(
      this.Maintainer,
      this.BASE.options.address,
      this.QUOTE.options.address,
      lpFeeRateModel.options.address,
      mtFeeRateModel.options.address,
      config.i,
      config.k,
      config.gasPriceLimit).send(this.sendParam(this.Deployer))

    this.DVM = contracts.getContractWithAddress(contracts.DVM_CONTROLLER_NAME, DVMAddress)

    console.log(log.blueText("[Init DVM context]"));
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

  async approveRoute(account: string) {
    await this.BASE.methods
      .approve(this.Route.options.address, MAX_UINT256)
      .send(this.sendParam(account));
    await this.QUOTE.methods
      .approve(this.Route.options.address, MAX_UINT256)
      .send(this.sendParam(account));
  }
}

export async function getDODOContext(
  config: DVMContextInitConfig = DefaultDVMContextInitConfig
): Promise<DVMContext> {
  var context = new DVMContext();
  await context.init(config);
  return context;
}
