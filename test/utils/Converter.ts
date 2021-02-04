import BigNumber from "bignumber.js";
import { getDefaultWeb3 } from './EVM';


export const MAX_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export function decimalStr(value: string): string {
  return new BigNumber(value).multipliedBy(10 ** 18).toFixed(0, BigNumber.ROUND_DOWN)
}

export function gweiStr(gwei: string): string {
  return new BigNumber(gwei).multipliedBy(10 ** 9).toFixed(0, BigNumber.ROUND_DOWN)
}

export function mweiStr(gwei: string): string {
  return new BigNumber(gwei).multipliedBy(10 ** 6).toFixed(0, BigNumber.ROUND_DOWN)
}

export function fromWei(value: string, unit: any): string {
  var web3 = getDefaultWeb3();
  return web3.utils.fromWei(value, unit);
}