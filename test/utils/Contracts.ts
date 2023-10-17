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
export const PERMISSION_MANAGER_NAME = "PermissionManager"
export const EXTERNAL_VALUE_NAME = "ExternalValue"
export const FEE_RATE_MODEL_NAME = "FeeRateModel"
export const DPP_NAME = "DPP"
export const DPP_FACTORY_NAME = "DPPFactory"
export const DSP_NAME = "DSP"
export const DSP_FACTORY_NAME = "DSPFactory"
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

export const NFT_VAULT = "NFTCollateralVault"
export const NFT_FEE = "FeeDistributor"
export const NFT_FRAG = "Fragment"
export const ERC721 = "InitializableERC721"
export const ERC1155 = "InitializableERC1155"
export const CONST_FEE_RATE_MODEL_NAME = "ConstFeeRateModel"
export const NFT_TOKEN_FACTORY = "NFTTokenFactory"
export const NFT_REGISTER = "DODONFTRegistry"
export const NFT_PROXY = "DODONFTProxy"
export const BUYOUT_MODEL = "BuyoutModel"

export const RANDOM_GENERATOR = "RandomGenerator"
export const MYSTERY_BOX_V1 = "DODODropsV1"

export const DROPS_V2 = "DODODrops"
export const DROPS_ERC721 = "DropsERC721"
export const DROPS_ERC1155 = "DropsERC1155"
export const DROPS_FEE_MODEL = "DropsFeeModel"
export const DROPS_PROXY = "DODODropsProxy"

export const DODO_NFT = "DODONFT"
export const DODO_NFT_1155 = "DODONFT1155"

export const FILTER_ERC721_V1 = "FilterERC721V1"
export const FILTER_ERC1155_V1 = "FilterERC1155V1"
export const FILTER_ADMIN = "FilterAdmin"
export const CONTROLLER = "Controller"
export const DODO_NFT_APPROVE = "DODONFTApprove"
export const DODO_NFT_POOL_PROXY = "DODONFTPoolProxy"


export const DODO_STARTER_PROXY = "DODOStarterProxy"
export const DODO_STARTER_FACTORY = "DODOStarterFactory"
export const FAIR_FUNDING = "FairFunding"
export const INSTANT_FUNDING = "InstantFunding"

// route
export const FEEMANGER = "FeeManager"
export const DODO_ROUTE_PROXY = "DODORouteProxy" 
export const DODO_ADAPTER = "DODOV2Adapter"
export const EXTERNAL_MOCK = "ExternalSwapMock"

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
    gas: process.env["COVERAGE"] ? 10000000000 : 6000000,
    gasPrice: web3.utils.toHex(web3.utils.toWei('1', 'wei'))
  }
  return await contract.deploy({ data: Json.byteCode, arguments: args }).send(parameter)
}