import BigNumber from "bignumber.js";

export const MAX_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export function decimalStr(value: string): string {
  return new BigNumber(value).multipliedBy(10 ** 18).toFixed(0, BigNumber.ROUND_DOWN)
}

export function gweiStr(gwei: string): string {
  return new BigNumber(gwei).multipliedBy(10 ** 9).toFixed(0, BigNumber.ROUND_DOWN)
}