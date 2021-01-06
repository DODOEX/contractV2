/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
var jsonPath: string = "../../build-v1/contracts/"
/*v1.5*/
var jsonPath2: string = "../../build/contracts/"
/******/
if (process.env["COVERAGE"]) {
  console.log("[Coverage mode]")
  jsonPath = "../../.coverage_artifacts/contracts/"
}

const CloneFactory = require(`${jsonPath}CloneFactory.json`)
const DODO = require(`${jsonPath}DODO.json`)
const DODOZoo = require(`${jsonPath}DODOZoo.json`)
const DODOEthProxy = require(`${jsonPath}DODOEthProxy.json`)
const TestERC20 = require(`${jsonPath}TestERC20.json`)
const NaiveOracle = require(`${jsonPath}NaiveOracle.json`)
const DODOLpToken = require(`${jsonPath}DODOLpToken.json`)
const Uniswap = require(`${jsonPath}UniswapV2Pair.json`)
const UniswapArbitrageur = require(`${jsonPath}UniswapArbitrageur.json`)
const DODOToken = require(`${jsonPath}DODOToken.json`)
const DODOMine = require(`${jsonPath}DODOMine.json`)
const DODOMineReader = require(`${jsonPath}DODOMineReader.json`)
const LockedTokenVault = require(`${jsonPath}LockedTokenVault.json`)
/*v1.5 */
const SmartSwap = require(`${jsonPath2}DODOV1Proxy01.json`)
const SmartSwap02 = require(`${jsonPath2}DODOV1Proxy02.json`)
const SmartApprove = require(`${jsonPath2}DODOApprove.json`)
const DODOSellHelper = require(`${jsonPath2}DODOSellHelper.json`)
const WETH = require(`${jsonPath2}WETH9.json`)
const CHI = require(`${jsonPath2}ChiToken.json`)
const DODOSwapCalcHelper = require(`${jsonPath2}DODOSwapCalcHelper.json`)
const DODOIncentive = require(`${jsonPath2}DODOIncentive.json`)
/******/

import { getDefaultWeb3 } from './EVM';
import { Contract } from 'web3-eth-contract';

export const CLONE_FACTORY_CONTRACT_NAME = "CloneFactory"
export const DODO_CONTRACT_NAME = "DODO"
export const TEST_ERC20_CONTRACT_NAME = "TestERC20"
export const NAIVE_ORACLE_CONTRACT_NAME = "NaiveOracle"
export const DODO_LP_TOKEN_CONTRACT_NAME = "DODOLpToken"
export const DODO_ZOO_CONTRACT_NAME = "DOOZoo"
export const DODO_WILD_CONTRACT_NAME = "DOOWild"
export const DODO_ETH_PROXY_CONTRACT_NAME = "DODOEthProxy"
export const WETH_CONTRACT_NAME = "WETH"
export const UNISWAP_CONTRACT_NAME = "Uniswap"
export const UNISWAP_ARBITRAGEUR_CONTRACT_NAME = "UniswapArbitrageur"
export const DODO_TOKEN_CONTRACT_NAME = "DODOToken"
export const LOCKED_TOKEN_VAULT_CONTRACT_NAME = "LockedTokenVault"
export const DODO_MINE_NAME = "DODOMine"
export const DODO_MINE_READER_NAME = "DODOMineReader"
/*v1.5 */
export const SMART_SWAP = "DODOV1Proxy01"
export const SMART_SWAP_02 = "DODOV1Proxy02"
export const SMART_APPROVE = "DODOApprove"
export const DODO_SELL_HELPER = "DODOSellHelper"
export const CHI_TOKEN = "ChiToken"
export const DODO_SWAP_CALC_HELPER = "DODOSwapCalcHelper"
export const DODO_INCENTIVE = "DODOIncentive"
/******/

var contractMap: { [name: string]: any } = {}
contractMap[CLONE_FACTORY_CONTRACT_NAME] = CloneFactory
contractMap[DODO_CONTRACT_NAME] = DODO
contractMap[TEST_ERC20_CONTRACT_NAME] = TestERC20
contractMap[NAIVE_ORACLE_CONTRACT_NAME] = NaiveOracle
contractMap[DODO_LP_TOKEN_CONTRACT_NAME] = DODOLpToken
contractMap[DODO_ZOO_CONTRACT_NAME] = DODOZoo
contractMap[DODO_ETH_PROXY_CONTRACT_NAME] = DODOEthProxy
contractMap[WETH_CONTRACT_NAME] = WETH
contractMap[UNISWAP_CONTRACT_NAME] = Uniswap
contractMap[UNISWAP_ARBITRAGEUR_CONTRACT_NAME] = UniswapArbitrageur
contractMap[DODO_TOKEN_CONTRACT_NAME] = DODOToken
contractMap[LOCKED_TOKEN_VAULT_CONTRACT_NAME] = LockedTokenVault
contractMap[DODO_MINE_NAME] = DODOMine
contractMap[DODO_MINE_READER_NAME] = DODOMineReader
/*v1.5 */
contractMap[SMART_SWAP] = SmartSwap
contractMap[SMART_SWAP_02] = SmartSwap02
contractMap[SMART_APPROVE] = SmartApprove
contractMap[DODO_SELL_HELPER] = DODOSellHelper
contractMap[CHI_TOKEN] = CHI
contractMap[DODO_SWAP_CALC_HELPER] = DODOSwapCalcHelper
contractMap[DODO_INCENTIVE] = DODOIncentive
/******/

interface ContractJson {
  abi: any;
  networks: { [network: number]: any };
  byteCode: string;
}

export function getContractJSON(contractName: string): ContractJson {
  var info = contractMap[contractName]
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