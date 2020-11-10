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

export interface DODOContextInitConfig {
  lpFeeRate: string;
  mtFeeRate: string;
  k: string;
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
export let DefaultDODOContextInitConfig = {
  lpFeeRate: decimalStr("0.002"),
  mtFeeRate: decimalStr("0.001"),
  k: decimalStr("0.1"),
  gasPriceLimit: gweiStr("100"),
};

export class DODOContext {
  EVM: EVM;
  Web3: Web3;
  DODOZoo: Contract;
  Deployer: string;
  Supervisor: string;
  Maintainer: string;
  spareAccounts: string[];
  lpFeeRate: string;
  mtFeeRate: string;
  k: string;
  
  //token
  DODO:Contract;
  USDT:Contract;
  USDC:Contract;
  WETH:Contract;
  //pair
  DODO_USDT: Contract;
  USDT_USDC: Contract;
  WETH_USDC: Contract;
  DODO_USDT_ORACLE: Contract;
  USDT_USDC_ORACLE: Contract;
  WETH_USDC_ORACLE: Contract;
  //SmartRoute
  SmartSwap: Contract;
  SmartApprove: Contract;

  constructor() {}

  async init(config: DODOContextInitConfig) {
    this.k = config.k;
    this.mtFeeRate = config.mtFeeRate;
    this.lpFeeRate = config.lpFeeRate;

    this.EVM = new EVM();
    this.Web3 = getDefaultWeb3();
    var cloneFactory = await contracts.newContract(
      contracts.CLONE_FACTORY_CONTRACT_NAME
    );
    const allAccounts = await this.Web3.eth.getAccounts();
    this.Deployer = allAccounts[0];
    this.Supervisor = allAccounts[1];
    this.Maintainer = allAccounts[2];
    this.spareAccounts = allAccounts.slice(3, 10);
    var DODOTemplate = await contracts.newContract(
      contracts.DODO_CONTRACT_NAME
    );
    this.DODOZoo = await contracts.newContract(
      contracts.DODO_ZOO_CONTRACT_NAME,
      [
        DODOTemplate.options.address,
        cloneFactory.options.address,
        this.Supervisor,
      ]
    );
    //发币
    this.DODO = await contracts.newContract(
      contracts.TEST_ERC20_CONTRACT_NAME,
      ["DODO", 18]
    );
    this.USDT = await contracts.newContract(
      contracts.TEST_ERC20_CONTRACT_NAME,
      ["USDT", 6]
    );
    this.USDC = await contracts.newContract(
      contracts.TEST_ERC20_CONTRACT_NAME,
      ["USDC", 6]
    );
    this.WETH = await contracts.newContract(
      contracts.TEST_ERC20_CONTRACT_NAME,
      ["WETH", 18]
    );
    //创建交易对
    //DODO-USDT
    this.DODO_USDT_ORACLE = await contracts.newContract(
      contracts.NAIVE_ORACLE_CONTRACT_NAME
    );
    await this.DODOZoo.methods
      .breedDODO(
        this.Maintainer,
        this.DODO.options.address,
        this.USDT.options.address,
        this.DODO_USDT_ORACLE.options.address,
        config.lpFeeRate,
        config.mtFeeRate,
        config.k,
        config.gasPriceLimit
      )
      .send(this.sendParam(this.Deployer));
    //USDT-USDC
    this.USDT_USDC_ORACLE = await contracts.newContract(
      contracts.NAIVE_ORACLE_CONTRACT_NAME
    );
    await this.DODOZoo.methods
      .breedDODO(
        this.Maintainer,
        this.USDT.options.address,
        this.USDC.options.address,
        this.USDT_USDC_ORACLE.options.address,
        config.lpFeeRate,
        config.mtFeeRate,
        config.k,
        config.gasPriceLimit
      )
      .send(this.sendParam(this.Deployer));
    //WETH-USDC
    this.WETH_USDC_ORACLE = await contracts.newContract(
      contracts.NAIVE_ORACLE_CONTRACT_NAME
    );
    await this.DODOZoo.methods
      .breedDODO(
        this.Maintainer,
        this.WETH.options.address,
        this.USDC.options.address,
        this.WETH_USDC_ORACLE.options.address,
        config.lpFeeRate,
        config.mtFeeRate,
        config.k,
        config.gasPriceLimit
      )
      .send(this.sendParam(this.Deployer));

    this.DODO_USDT = contracts.getContractWithAddress(
      contracts.DODO_CONTRACT_NAME,
      await this.DODOZoo.methods
        .getDODO(this.DODO.options.address, this.USDT.options.address)
        .call()
    );

    this.USDT_USDC = contracts.getContractWithAddress(
      contracts.DODO_CONTRACT_NAME,
      await this.DODOZoo.methods
        .getDODO(this.USDT.options.address, this.USDC.options.address)
        .call()
    );
    this.WETH_USDC = contracts.getContractWithAddress(
      contracts.DODO_CONTRACT_NAME,
      await this.DODOZoo.methods
        .getDODO(this.WETH.options.address, this.USDC.options.address)
        .call()
    );

    await this.DODO_USDT.methods
      .enableBaseDeposit()
      .send(this.sendParam(this.Deployer));
    await this.DODO_USDT.methods
      .enableQuoteDeposit()
      .send(this.sendParam(this.Deployer));
    await this.DODO_USDT.methods.enableTrading().send(this.sendParam(this.Deployer));

    await this.USDT_USDC.methods
      .enableBaseDeposit()
      .send(this.sendParam(this.Deployer));
    await this.USDT_USDC.methods
      .enableQuoteDeposit()
      .send(this.sendParam(this.Deployer));
    await this.USDT_USDC.methods.enableTrading().send(this.sendParam(this.Deployer));

    await this.WETH_USDC.methods
      .enableBaseDeposit()
      .send(this.sendParam(this.Deployer));
    await this.WETH_USDC.methods
      .enableQuoteDeposit()
      .send(this.sendParam(this.Deployer));
    await this.WETH_USDC.methods.enableTrading().send(this.sendParam(this.Deployer));

    this.SmartApprove = await contracts.newContract(
      contracts.SMART_APPROVE
    );

    this.SmartSwap = await contracts.newContract(
      contracts.SMART_SWAP,
      [this.SmartApprove.options.address]
    );

    await this.SmartApprove.methods.setSmartSwap(this.SmartSwap.options.address).send(this.sendParam(this.Deployer));

    console.log(log.blueText("[Init dodo context]"));
  }

  sendParam(sender, value = "0") {
    return {
      from: sender,
      gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
      gasPrice: process.env.GAS_PRICE,
      value: decimalStr(value),
    };
  }

  async setOraclePrice(oracle:Contract,price: string) {
    await oracle.methods
      .setPrice(price)
      .send(this.sendParam(this.Deployer));
  }

  async mintToken(tokenBase:Contract,tokenQuote:Contract,to: string, base: string, quote: string) {
    await tokenBase.methods.mint(to, base).send(this.sendParam(this.Deployer));
    await tokenQuote.methods
      .mint(to,  quote)
      .send(this.sendParam(this.Deployer));
  }

  async approvePair(tokenBase:Contract,tokenQuote:Contract, approveTarget:string,account: string) {
    await tokenBase.methods
      .approve(approveTarget, MAX_UINT256)
      .send(this.sendParam(account));
    await tokenQuote.methods
      .approve(approveTarget, MAX_UINT256)
      .send(this.sendParam(account));
  }
}

export async function getDODOContext(
  config: DODOContextInitConfig = DefaultDODOContextInitConfig
): Promise<DODOContext> {
  var context = new DODOContext();
  await context.init(config);
  return context;
}
