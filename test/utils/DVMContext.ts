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

export interface DVMContextInitConfig {
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
export let DefaultDVMContextInitConfig = {
  lpFeeRate: decimalStr("0.002"),
  mtFeeRate: decimalStr("0.001"),
  k: decimalStr("0.1"),
  i: decimalStr("100"),
};

export class DVMContext {
  EVM: EVM;
  Web3: Web3;
  DVM: Contract;
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

    this.DVM = await contracts.newContract(contracts.DVM_NAME)
    var lpFeeRateModel = await contracts.newContract(contracts.FEE_RATE_MODEL_NAME)
    var mtFeeRateModel = await contracts.newContract(contracts.FEE_RATE_MODEL_NAME)
    this.mtFeeRateModel = mtFeeRateModel;
    this.MtFeeRate = mtFeeRateModel.options.address
    var permissionManager = await contracts.newContract(contracts.PERMISSION_MANAGER_NAME)
    var gasPriceSource = await contracts.newContract(contracts.EXTERNAL_VALUE_NAME)

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

    await this.DVM.methods.init(
      // this.Deployer,
      this.Maintainer,
      this.BASE.options.address,
      this.QUOTE.options.address,
      // lpFeeRateModel.options.address,
      0,
      mtFeeRateModel.options.address,
      // permissionManager.options.address,
      // gasPriceSource.options.address,
      config.i,
      config.k,
      true
    ).send(this.sendParam(this.Deployer))

    await gasPriceSource.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer))
    await gasPriceSource.methods.set(MAX_UINT256).send(this.sendParam(this.Deployer))


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

  async transferBaseToDVM(account: string, amount: string) {
    await this.BASE.methods.transfer(this.DVM.options.address, amount).send(this.sendParam(account))
  }

  async transferQuoteToDVM(account: string, amount: string) {
    await this.QUOTE.methods.transfer(this.DVM.options.address, amount).send(this.sendParam(account))
  }
}

export async function getDVMContext(
  config: DVMContextInitConfig = DefaultDVMContextInitConfig
): Promise<DVMContext> {
  var context = new DVMContext();
  await context.init(config);
  return context;
}
