/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from "bignumber.js";
import Web3 from "web3";
import { Contract } from "web3-eth-contract";

import * as contracts from "./Contracts";
import { decimalStr, MAX_UINT256 } from "./Converter";
import { EVM, getDefaultWeb3 } from "./EVM";
import * as log from "./Log";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80
});

export interface DPPContextBalances {
  traderBase: string,
  traderQuote: string,
  DPPBase: string,
  DPPQuote: string,
  maintainerBase: string,
  maintainerQuote: string
}

export interface DPPContextInitConfig {
  lpFeeRate: string;
  mtFeeRate: string;
  k: string;
  i: string;
  isOpenTWAP: boolean
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
export let DefaultDPPContextInitConfig = {
  lpFeeRate: decimalStr("0.002"),
  mtFeeRate: decimalStr("0.001"),
  k: decimalStr("0.1"),
  i: decimalStr("100"),
  isOpenTWAP: true
};

export class DPPContext {
  EVM: EVM;
  Web3: Web3;
  DPP: Contract;
  BASE: Contract;
  QUOTE: Contract;
  Deployer: string;
  Maintainer: string;
  SpareAccounts: string[];

  constructor() {
  }

  async init(config: DPPContextInitConfig) {
    this.EVM = new EVM();
    this.Web3 = getDefaultWeb3();

    this.DPP = await contracts.newContract(contracts.DPP_NAME);
    // var lpFeeRateModel = await contracts.newContract(contracts.CONST_FEE_RATE_MODEL_NAME);
    var mtFeeRateModel = await contracts.newContract(contracts.CONST_FEE_RATE_MODEL_NAME);
    var permissionManager = await contracts.newContract(contracts.PERMISSION_MANAGER_NAME);
    var gasPriceSource = await contracts.newContract(contracts.EXTERNAL_VALUE_NAME);
    var iSource = await contracts.newContract(contracts.EXTERNAL_VALUE_NAME);
    var kSource = await contracts.newContract(contracts.EXTERNAL_VALUE_NAME);
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
    this.Maintainer = allAccounts[2];
    this.SpareAccounts = allAccounts.slice(2, 10);

    await gasPriceSource.methods.init(this.Deployer, MAX_UINT256).send(this.sendParam(this.Deployer));
    // await lpFeeRateModel.methods.init(this.DPP.options.address, config.lpFeeRate).send(this.sendParam(this.Deployer));
    await mtFeeRateModel.methods.init(this.DPP.options.address, config.mtFeeRate).send(this.sendParam(this.Deployer));

    await kSource.methods.init(this.DPP.options.address, config.k).send(this.sendParam(this.Deployer));
    await iSource.methods.init(this.DPP.options.address, config.i).send(this.sendParam(this.Deployer));

    await this.DPP.methods.init(
      this.Deployer,
      this.Maintainer,
      this.BASE.options.address,
      this.QUOTE.options.address,
      config.lpFeeRate,
      mtFeeRateModel.options.address,
      config.k,
      config.i,
      config.isOpenTWAP
    ).send(this.sendParam(this.Deployer));

    console.log(log.blueText("[Init DPP context]"));
  }

  sendParam(sender, value = "0") {
    return {
      from: sender,
      gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
      gasPrice: process.env.GAS_PRICE,
      value: decimalStr(value)
    };
  }

  async mintTestToken(to: string, base: string, quote: string) {
    await this.BASE.methods.mint(to, base).send(this.sendParam(this.Deployer));
    await this.QUOTE.methods
      .mint(to, quote)
      .send(this.sendParam(this.Deployer));
  }

  async transferBaseToDPP(account: string, amount: string) {
    await this.BASE.methods.transfer(this.DPP.options.address, amount).send(this.sendParam(account));
  }

  async transferQuoteToDPP(account: string, amount: string) {
    await this.QUOTE.methods.transfer(this.DPP.options.address, amount).send(this.sendParam(account));
  }

  async getBalances(trader: string) {
    var balances: DPPContextBalances = {
      traderBase: await this.BASE.methods.balanceOf(trader).call(),
      traderQuote: await this.QUOTE.methods.balanceOf(trader).call(),
      DPPBase: await this.BASE.methods.balanceOf(this.DPP.options.address).call(),
      DPPQuote: await this.QUOTE.methods.balanceOf(this.DPP.options.address).call(),
      maintainerBase: await this.BASE.methods.balanceOf(this.Maintainer).call(),
      maintainerQuote: await this.QUOTE.methods.balanceOf(this.Maintainer).call()
    };
    return balances;
  }
}

export async function getDPPContext(
  config: DPPContextInitConfig = DefaultDPPContextInitConfig
): Promise<DPPContext> {
  var context = new DPPContext();
  await context.init(config);
  return context;
}
