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

export interface CPContextInitConfig {
  totalBase: string;
  poolQuoteCap: string;
  k: string;
  i: string;
  lpFeeRate: string;
  bidDuration: BigNumber;
  calmDuration: BigNumber;
  freezeDuration: BigNumber;
  vestingDuration: BigNumber;
  cliffRate: string;
  quoteTokenContract: string;
  isOpenTWAP:true
}


export class CPContext {
  EVM: EVM;
  Web3: Web3;
  DVMFactory: Contract;
  CP: Contract;
  BASE: Contract;
  QUOTE: Contract;
  Deployer: string;
  Maintainer: string;
  SpareAccounts: string[];
  DODOCallee: Contract;

  constructor() { }

  async init(config: CPContextInitConfig) {
    this.EVM = new EVM();
    this.Web3 = getDefaultWeb3();

    const allAccounts = await this.Web3.eth.getAccounts();
    this.Deployer = allAccounts[0];
    this.Maintainer = allAccounts[1];
    this.SpareAccounts = allAccounts.slice(2, 10);

    var cloneFactory = await contracts.newContract(
      contracts.CLONE_FACTORY_CONTRACT_NAME
    );
    var dvmTemplate = await contracts.newContract(contracts.DVM_NAME)
    var feeRateModel = await contracts.newContract(contracts.FEE_RATE_MODEL_NAME)
    var permissionManager = await contracts.newContract(contracts.PERMISSION_MANAGER_NAME)
    var defaultGasSource = await contracts.newContract(contracts.EXTERNAL_VALUE_NAME)

    this.BASE = await contracts.newContract(
      contracts.MINTABLE_ERC20_CONTRACT_NAME,
      ["TestBase", "BASE", 18]
    );
    if(config.quoteTokenContract){
      this.QUOTE = await contracts.newContract(
        config.quoteTokenContract,
        ["WETH9", "WETH9", 18]
      );
    }else{
      this.QUOTE = await contracts.newContract(
        contracts.MINTABLE_ERC20_CONTRACT_NAME,
        ["TestQuote", "QUOTE", 18]
      );
    }
    this.DODOCallee = await contracts.newContract(contracts.DODO_CALLEE_HELPER_NAME,[this.QUOTE.options.address]);

    this.DVMFactory = await contracts.newContract(contracts.DVM_FACTORY_NAME,
      [
        cloneFactory.options.address,
        dvmTemplate.options.address,
        this.Maintainer,
        feeRateModel.options.address,
      ]
    )

    this.CP = await contracts.newContract(contracts.CROWD_POOLING_NAME)
    this.BASE.methods.mint(this.CP.options.address, config.totalBase).send(this.sendParam(this.Deployer));

    await this.Web3.eth.sendTransaction( {
      from: this.Deployer,
      to:this.CP.options.address,
      gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
      gasPrice: mweiStr("1000"),
      value: decimalStr("0.2"),
    });

    this.CP.methods.init(
      [
        this.Deployer,
        this.Maintainer,
        this.BASE.options.address,
        this.QUOTE.options.address,
        permissionManager.options.address,
        feeRateModel.options.address,
        this.DVMFactory.options.address
      ],
      [
        (await this.Web3.eth.getBlock(await this.Web3.eth.getBlockNumber())).timestamp,
        config.bidDuration,
        config.calmDuration,
        config.freezeDuration,
        config.vestingDuration
      ],
      [
        config.poolQuoteCap,
        config.k,
        config.i,
        config.cliffRate
      ],
      config.isOpenTWAP
    ).send(this.sendParam(this.Deployer))

    await defaultGasSource.methods.init(this.Deployer, MAX_UINT256).send(this.sendParam(this.Deployer));

    console.log(log.blueText("[Init CrowdPooling context]"));
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
}
