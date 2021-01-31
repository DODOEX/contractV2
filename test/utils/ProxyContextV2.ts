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


export class ProxyContext {
  EVM: EVM;
  Web3: Web3;
  DODOProxyV2: Contract;
  DVMFactory: Contract;
  DPPFactory: Contract;
  CPFactory: Contract;
  DODOApprove: Contract;
  DODOApproveProxy: Contract;
  DODOCalleeHelper: Contract;
  DODOSellHelper: Contract;

  //token
  DODO: Contract;
  USDC: Contract;
  USDT: Contract;
  WETH: Contract;

  //Functions
  DODOIncentive: Contract;
  mtFeeRateModel: Contract;

  Deployer: string;
  Maintainer: string;
  SpareAccounts: string[];

  constructor() { }

  async init(weth:string) {
    this.EVM = new EVM();
    this.Web3 = getDefaultWeb3();
    const allAccounts = await this.Web3.eth.getAccounts();
    this.Deployer = allAccounts[0];
    this.Maintainer = allAccounts[1];
    this.SpareAccounts = allAccounts.slice(2, 10);

    this.WETH = contracts.getContractWithAddress(contracts.WETH_CONTRACT_NAME, weth);

    this.DODO = await contracts.newContract(
      contracts.MINTABLE_ERC20_CONTRACT_NAME,
      ["DODO Token", "DODO", 18]
    );
    this.USDT = await contracts.newContract(
      contracts.MINTABLE_ERC20_CONTRACT_NAME,
      ["USDT Token", "USDT", 6]
    );
    this.USDC = await contracts.newContract(
      contracts.MINTABLE_ERC20_CONTRACT_NAME,
      ["USDC Token", "USDC", 6]
    );

    var cloneFactory = await contracts.newContract(
      contracts.CLONE_FACTORY_CONTRACT_NAME
    );
    var dvmTemplate = await contracts.newContract(contracts.DVM_NAME)
    var dppTemplate = await contracts.newContract(contracts.DPP_NAME)
    var cpTemplate = await contracts.newContract(contracts.CROWD_POOLING_NAME)
    var dppAdminTemplate = await contracts.newContract(contracts.DPP_ADMIN_NAME)
    var permissionManagerTemplate = await contracts.newContract(contracts.PERMISSION_MANAGER_NAME)
    var mtFeeRateModelTemplate = await contracts.newContract(contracts.FEE_RATE_MODEL_NAME)
    this.mtFeeRateModel = mtFeeRateModelTemplate;


    this.DVMFactory = await contracts.newContract(contracts.DVM_FACTORY_NAME,
      [
        cloneFactory.options.address,
        dvmTemplate.options.address,
        this.Deployer,
        mtFeeRateModelTemplate.options.address
       ]
    )

    this.DODOApprove = await contracts.newContract(
      contracts.SMART_APPROVE
    );

    this.DODOApproveProxy = await contracts.newContract(
      contracts.SMART_APPROVE_PROXY,
      [this.DODOApprove.options.address]
    )

    //DODO Incentive
    this.DODOIncentive = await contracts.newContract(
      contracts.DODO_INCENTIVE,
      [this.DODO.options.address]
    )

    this.DPPFactory = await contracts.newContract(contracts.DPP_FACTORY_NAME,
      [
        cloneFactory.options.address,
        dppTemplate.options.address,
        dppAdminTemplate.options.address,
        this.Deployer,
        mtFeeRateModelTemplate.options.address,
        this.DODOApproveProxy.options.address
      ]
    )

    this.CPFactory = await contracts.newContract(contracts.CROWD_POOLING_FACTORY,
      [
        cloneFactory.options.address,
        cpTemplate.options.address,
        this.DVMFactory.options.address,
        this.Deployer,
        mtFeeRateModelTemplate.options.address,
        permissionManagerTemplate.options.address
      ]  
    )

    this.DODOSellHelper = await contracts.newContract(
      contracts.DODO_SELL_HELPER
    );


    this.DODOProxyV2 = await contracts.newContract(contracts.DODO_PROXY_NAME,
      [
        this.DVMFactory.options.address,
        this.DPPFactory.options.address,
        this.CPFactory.options.address,
        this.WETH.options.address,
        this.DODOApproveProxy.options.address,
        this.DODOSellHelper.options.address,
        "0x0000000000000000000000000000000000000000",
        this.DODOIncentive.options.address
      ]
    );

    await this.DODOProxyV2.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));
    await this.DODOApprove.methods.init(this.Deployer,this.DODOApproveProxy.options.address).send(this.sendParam(this.Deployer));
    await this.DODOApproveProxy.methods.init(this.Deployer, [this.DODOProxyV2.options.address]).send(this.sendParam(this.Deployer));

    await this.DODOIncentive.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));
    await this.DODOIncentive.methods.changeDODOProxy(this.DODOProxyV2.options.address).send(this.sendParam(this.Deployer));

    this.DODOCalleeHelper = await contracts.newContract(
      contracts.DODO_CALLEE_HELPER_NAME,
      [this.WETH.options.address]
    )

    console.log(log.blueText("[Init DVM context]"));
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

  async approveProxy(account: string) {
    await this.DODO.methods
      .approve(this.DODOApprove.options.address, MAX_UINT256)
      .send(this.sendParam(account));
    await this.USDT.methods
      .approve(this.DODOApprove.options.address, MAX_UINT256)
      .send(this.sendParam(account));
    await this.USDC.methods
      .approve(this.DODOApprove.options.address, MAX_UINT256)
      .send(this.sendParam(account));
    await this.WETH.methods
      .approve(this.DODOApprove.options.address, MAX_UINT256)
      .send(this.sendParam(account));
  }
}

export async function getProxyContext(weth:string): Promise<ProxyContext> {
  var context = new ProxyContext();
  await context.init(weth);
  return context;
}
