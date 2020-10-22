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