/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
var jsonPath: string = "../../build/contracts/"
if (process.env["COVERAGE"]) {
  console.log("[Coverage mode]")
  jsonPath = "../../.coverage_artifacts/contracts/"
}

import { getDefaultWeb3 } from './EVM';
import { Contract } from 'web3-eth-contract';

export const CLONE_FACTORY_CONTRACT_NAME = "CloneFactory"
export const DODO_CONTRACT_NAME = "DODO"
export const MINTABLE_ERC20_CONTRACT_NAME = "MintableERC20"
export const NAIVE_ORACLE_CONTRACT_NAME = "NaiveOracle"
export const DODO_LP_TOKEN_CONTRACT_NAME = "DODOLpToken"
export const DODO_ZOO_CONTRACT_NAME = "DOOZoo"
export const DODO_WILD_CONTRACT_NAME = "DOOWild"
export const DODO_ETH_PROXY_CONTRACT_NAME = "DODOEthProxy"
export const WETH_CONTRACT_NAME = "WETH9"
export const UNISWAP_CONTRACT_NAME = "Uniswap"
export const UNISWAP_ARBITRAGEUR_CONTRACT_NAME = "UniswapArbitrageur"
export const DODO_TOKEN_CONTRACT_NAME = "DODOToken"
export const LOCKED_TOKEN_VAULT_CONTRACT_NAME = "LockedTokenVault"
export const DODO_MINE_NAME = "DODOMine"
export const DODO_MINE_READER_NAME = "DODOMineReader"
export const DVM_VAULT_NAME = "DVMVault"
export const DVM_NAME = "DVM"
export const DVM_FACTORY_NAME = "DVMFactory"
export const DVM_PROXY_NAME = "DVMProxy"
export const CONST_FEE_RATE_MODEL_NAME = "ConstFeeRateModel"
export const PERMISSION_MANAGER_NAME = "PermissionManager"
export const EXTERNAL_VALUE_NAME = "ExternalValue"
export const FEE_RATE_MODEL_NAME = "FeeRateModel"
export const DPP_NAME = "DPP"
export const DPP_FACTORY_NAME = "DPPFactory"
export const SMART_APPROVE = "DODOApprove"
export const SMART_APPROVE_PROXY = "DODOApproveProxy"
export const DODO_SELL_HELPER = "DODOSellHelper"
export const DPP_ADMIN_NAME = "DPPAdmin"
export const DODO_CALLEE_HELPER_NAME = "DODOCalleeHelper"
export const CROWD_POOLING_NAME = "CP"
export const CROWD_POOLING_FACTORY = "CrowdPoolingFactory"
export const DODO_INCENTIVE = "DODOIncentive"
export const VDODO_NAME = "vDODOToken"
export const DODO_CULATION_HELPER = "DODOCirculationHelper"
export const DODO_GOVERNANCE = "Governance"
export const DODO_PROXY_NAME = "DODOV2Proxy02"
export const ERC20_MINE = "ERC20Mine"
export const VDODO_MINE = "vDODOMine"

interface ContractJson {
  abi: any;
  networks: { [network: number]: any };
  byteCode: string;
}

export function getContractJSON(contractName: string): ContractJson {
  var info = require(`${jsonPath}${contractName}.json`)
  return {
    abi: info.abi,
    networks: info.networks,
    byteCode: info.bytecode
  }
}

export function getContractWithAddress(contractName: string, address: string) {
  var Json = getContractJSON(contractName)
  var web3 = getDefaultWeb3()
  return new web3.eth.Contract(Json.abi, address)
}

export function getDepolyedContract(contractName: string): Contract {
  var Json = getContractJSON(contractName)
  var networkId = process.env.NETWORK_ID
  var deployedAddress = getContractJSON(contractName).networks[networkId].address
  var web3 = getDefaultWeb3()
  return new web3.eth.Contract(Json.abi, deployedAddress)
}

export async function newContract(contractName: string, args: any[] = []): Promise<Contract> {
  var web3 = getDefaultWeb3()
  var Json = getContractJSON(contractName)
  var contract = new web3.eth.Contract(Json.abi)
  var adminAccount = (await web3.eth.getAccounts())[0]
  let parameter = {
    from: adminAccount,
    gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
    gasPrice: web3.utils.toHex(web3.utils.toWei('1', 'wei'))
  }
  return await contract.deploy({ data: Json.byteCode, arguments: args }).send(parameter)
}