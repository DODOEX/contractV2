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
  DODO: Contract;
  USDT: Contract;
  USDC: Contract;
  WETH: Contract;
  CHI: Contract;
  GST2: Contract;
  //pair
  DODO_USDT: Contract;
  USDT_USDC: Contract;
  WETH_USDC: Contract;
  DODO_USDT_ORACLE: Contract;
  USDT_USDC_ORACLE: Contract;
  WETH_USDC_ORACLE: Contract;
  DODOV1Proxy01: Contract;
  DODOV1Proxy02: Contract;
  DODOApprove: Contract;
  DODOSellHelper: Contract;
  //Helper
  DODOSwapCalcHelper: Contract;


  constructor() { }

  async init(config: DODOContextInitConfig,weth:string) {
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

    this.WETH = contracts.getContractWithAddress(contracts.WETH_CONTRACT_NAME, weth);


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

    this.DODOSellHelper = await contracts.newContract(
      contracts.DODO_SELL_HELPER
    );

    this.DODOApprove = await contracts.newContract(
      contracts.SMART_APPROVE
    );

    //Gas Token 
    this.CHI = await contracts.newContract(
      contracts.CHI_TOKEN
    );

    // await this.CHI.methods.mint(140).send(this.sendParam(this.Deployer));

    this.DODOV1Proxy01 = await contracts.newContract(
      contracts.SMART_SWAP,
      [this.DODOApprove.options.address, this.DODOSellHelper.options.address, this.WETH.options.address, this.CHI.options.address]
      // [this.DODOApprove.options.address, this.DODOSellHelper.options.address, this.WETH.options.address, "0x0000000000000000000000000000000000000000"]
    );

    this.DODOV1Proxy02 = await contracts.newContract(
      contracts.SMART_SWAP_02,
      [this.DODOApprove.options.address, this.DODOSellHelper.options.address, this.WETH.options.address, this.CHI.options.address]
      // [this.DODOApprove.options.address, this.DODOSellHelper.options.address, this.WETH.options.address, "0x0000000000000000000000000000000000000000"]
    );

    await this.DODOV1Proxy01.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));
    await this.DODOV1Proxy02.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));
    
    await this.DODOApprove.methods.init(this.Deployer, this.DODOV1Proxy01.options.address).send(this.sendParam(this.Deployer));

    this.DODOSwapCalcHelper = await contracts.newContract(
      contracts.DODO_SWAP_CALC_HELPER,[this.DODOSellHelper.options.address]
    );

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

  async setOraclePrice(oracle: Contract, price: string) {
    await oracle.methods
      .setPrice(price)
      .send(this.sendParam(this.Deployer));
  }

  async mintToken(tokenBase: Contract, tokenQuote: Contract, to: string, base: string, quote: string) {
    if (tokenBase != null)
      await tokenBase.methods.mint(to, base).send(this.sendParam(this.Deployer));
    if (tokenQuote != null)
      await tokenQuote.methods.mint(to, quote).send(this.sendParam(this.Deployer));
  }


  async approvePair(tokenBase: Contract, tokenQuote: Contract, approveTarget: string, account: string) {
    await tokenBase.methods
      .approve(approveTarget, MAX_UINT256)
      .send(this.sendParam(account));
    await tokenQuote.methods
      .approve(approveTarget, MAX_UINT256)
      .send(this.sendParam(account));
  }
}

export async function getDODOContext(
  weth:string, config: DODOContextInitConfig = DefaultDODOContextInitConfig
): Promise<DODOContext> {
  var context = new DODOContext();
  await context.init(config,weth);
  return context;
}
