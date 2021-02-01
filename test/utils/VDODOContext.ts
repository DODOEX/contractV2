/*

    Copyright 2021 DODO ZOO.
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

export class VDODOContext {
  EVM: EVM;
  Web3: Web3;
  Deployer: string;
  Maintainer: string;
  SpareAccounts: string[];

  //token
  DODO: Contract;
  VDODO: Contract;

  DODOApprove: Contract;
  DODOApproveProxy: Contract;

  DODOCirculationHelper: Contract;
  Governance: Contract;

  lastRewardBlock:number;
  alpha:number;



  constructor() { }

  async init() {
    this.EVM = new EVM();
    this.Web3 = getDefaultWeb3();

    this.DODO = await contracts.newContract(
      contracts.MINTABLE_ERC20_CONTRACT_NAME,
      ["DODO Token", "DODO", 18]
    );

    this.DODOCirculationHelper = await contracts.newContract(
      contracts.DODO_CULATION_HELPER,
      [
        this.DODO.options.address
      ]
    );
    this.DODOApprove = await contracts.newContract(
      contracts.SMART_APPROVE
    );

    this.DODOApproveProxy = await contracts.newContract(
      contracts.SMART_APPROVE_PROXY,
      [this.DODOApprove.options.address]
    )

    this.VDODO = await contracts.newContract(
      contracts.VDODO_NAME,
      [
        this.DODO.options.address,
        this.DODOCirculationHelper.options.address,
        this.DODOApproveProxy.options.address,
        "VDODO Token", "VDODO"
      ]
    )

    this.Governance = await contracts.newContract(
      contracts.DODO_GOVERNANCE,
      [this.VDODO.options.address]
    )

    const allAccounts = await this.Web3.eth.getAccounts();
    this.Deployer = allAccounts[0];
    this.Maintainer = allAccounts[1];
    this.SpareAccounts = allAccounts.slice(2, 10);

    await this.VDODO.methods.updateGovernance(
      this.Governance.options.address
    ).send(this.sendParam(this.Deployer))

    this.alpha = await this.VDODO.methods.alpha().call();
    this.lastRewardBlock = await this.VDODO.methods.lastRewardBlock().call();
    
    console.log("alpha = "+ this.alpha);
    console.log("lastRewardBlock = " + this.lastRewardBlock);
    console.log(log.blueText("[Init VDODO context]"));
  }

  sendParam(sender, value = "0") {
    return {
      from: sender,
      gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
      gasPrice: process.env.GAS_PRICE,
      value: decimalStr(value),
    };
  }

  async mintTestToken(to: string, amount: string) {
    await this.DODO.methods.mint(to, amount).send(this.sendParam(this.Deployer));
  }
}

export async function getVDODOContext(): Promise<VDODOContext> {
  var context = new VDODOContext();
  await context.init();
  return context;
}
