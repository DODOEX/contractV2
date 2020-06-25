/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
var jsonPath: string = "../../build/contracts/"
if (process.env["COVERAGE"]) {
  console.log("[Coverage mode]")
  jsonPath = "../../.coverage_artifacts/contracts/"
}

const DODO = require(`${jsonPath}DODO.json`)
const DODOZoo = require(`${jsonPath}DODOZoo.json`)
const DODOEthProxy = require(`${jsonPath}DODOEthProxy.json`)
const WETH = require(`${jsonPath}WETH9.json`)
const TestERC20 = require(`${jsonPath}TestERC20.json`)
const NaiveOracle = require(`${jsonPath}NaiveOracle.json`)
const DODOLpToken = require(`${jsonPath}DODOLpToken.json`)

import { getDefaultWeb3 } from './EVM';
import { Contract } from 'web3-eth-contract';

export const DODO_CONTRACT_NAME = "DODO"
export const TEST_ERC20_CONTRACT_NAME = "TestERC20"
export const NAIVE_ORACLE_CONTRACT_NAME = "NaiveOracle"
export const DODO_LP_TOKEN_CONTRACT_NAME = "DODOLpToken"
export const DODO_ZOO_CONTRACT_NAME = "DOOZoo"
export const DODO_ETH_PROXY_CONTRACT_NAME = "DODOEthProxy"
export const WETH_CONTRACT_NAME = "WETH"

interface ContractJson {
  abi: any;
  networks: { [network: number]: any };
  byteCode: string;
}

function _getContractJSON(contractName: string): ContractJson {
  switch (contractName) {
    case DODO_CONTRACT_NAME:
      return {
        abi: DODO.abi,
        networks: DODO.networks,
        byteCode: DODO.bytecode
      };
    case TEST_ERC20_CONTRACT_NAME:
      return {
        abi: TestERC20.abi,
        networks: TestERC20.networks,
        byteCode: TestERC20.bytecode
      };
    case NAIVE_ORACLE_CONTRACT_NAME:
      return {
        abi: NaiveOracle.abi,
        networks: NaiveOracle.networks,
        byteCode: NaiveOracle.bytecode
      };
    case DODO_LP_TOKEN_CONTRACT_NAME:
      return {
        abi: DODOLpToken.abi,
        networks: DODOLpToken.networks,
        byteCode: DODOLpToken.bytecode
      };
    case DODO_ZOO_CONTRACT_NAME:
      return {
        abi: DODOZoo.abi,
        networks: DODOZoo.networks,
        byteCode: DODOZoo.bytecode
      };
    case DODO_ETH_PROXY_CONTRACT_NAME:
      return {
        abi: DODOEthProxy.abi,
        networks: DODOEthProxy.networks,
        byteCode: DODOEthProxy.bytecode
      };
    case WETH_CONTRACT_NAME:
      return {
        abi: WETH.abi,
        networks: WETH.networks,
        byteCode: WETH.bytecode
      };
    default:
      throw "CONTRACT_NAME_NOT_FOUND";
  }
}

export function getContractWithAddress(contractName: string, address: string) {
  var Json = _getContractJSON(contractName)
  var web3 = getDefaultWeb3()
  return new web3.eth.Contract(Json.abi, address)
}

export function getDepolyedContract(contractName: string): Contract {
  var Json = _getContractJSON(contractName)
  var networkId = process.env.NETWORK_ID
  var deployedAddress = _getContractJSON(contractName).networks[networkId].address
  var web3 = getDefaultWeb3()
  return new web3.eth.Contract(Json.abi, deployedAddress)
}

export async function newContract(contractName: string, args: any[] = []): Promise<Contract> {
  var web3 = getDefaultWeb3()
  var Json = _getContractJSON(contractName)
  var contract = new web3.eth.Contract(Json.abi)
  var adminAccount = (await web3.eth.getAccounts())[0]
  let parameter = {
    from: adminAccount,
    gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
    gasPrice: web3.utils.toHex(web3.utils.toWei('1', 'wei'))
  }
  return await contract.deploy({ data: Json.byteCode, arguments: args }).send(parameter)
}