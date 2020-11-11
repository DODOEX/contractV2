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
    var dvmTemplate = await contracts.newContract(contracts.DVM_NAME)
    var feeRateModelTemplate = await contracts.newContract(contracts.CONST_FEE_RATE_MODEL_NAME)
    var permissionManagerTemplate = await contracts.newContract(contracts.PERMISSION_MANAGER_NAME)
    var gasPriceSource = await contracts.newContract(contracts.GAS_PRICE_SOURCE_NAME)

    this.DVMFactory = await contracts.newContract(contracts.DVM_FACTORY_NAME,
      [cloneFactory.options.address,
      vaultTemplate.options.address,
      dvmTemplate.options.address,
      feeRateModelTemplate.options.address,
      permissionManagerTemplate.options.address,
      gasPriceSource.options.address,
      ])

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

    await this.DVMFactory.methods.createStandardDODOVendorMachine(
      this.BASE.options.address,
      this.QUOTE.options.address,
      config.lpFeeRate,
      config.mtFeeRate,
      config.i,
      config.k
    ).send(this.sendParam(this.Deployer))

    var vendorMachines = await this.DVMFactory.methods.getVendorMachine(this.BASE.options.address, this.QUOTE.options.address).call()
    this.DVM = contracts.getContractWithAddress(contracts.DVM_NAME, vendorMachines[0])
    this.Vault = contracts.getContractWithAddress(contracts.DVM_VAULT_NAME, await this.DVM.methods._VAULT_().call())

    await this.DVM.methods.setMaintainer(this.Maintainer).send(this.sendParam(this.Deployer))
    await gasPriceSource.methods.setGasPrice(MAX_UINT256).send(this.sendParam(this.Deployer))

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

export async function getDVMContext(
  config: DVMContextInitConfig = DefaultDVMContextInitConfig
): Promise<DVMContext> {
  var context = new DVMContext();
  await context.init(config);
  return context;
}
