/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import { TransactionReceipt } from "web3-core"

export const blueText = x => `\x1b[36m${x}\x1b[0m`;
export const yellowText = x => `\x1b[33m${x}\x1b[0m`;
export const greenText = x => `\x1b[32m${x}\x1b[0m`;
export const redText = x => `\x1b[31m${x}\x1b[0m`;
export const numberWithCommas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function logGas(receipt: TransactionReceipt, desc: string) {
  const gasUsed = receipt.gasUsed;
  let colorFn;

  if (gasUsed < 80000) {
    colorFn = greenText;
  } else if (gasUsed < 200000) {
    colorFn = yellowText;
  } else {
    colorFn = redText;
  }

  console.log(("Gas used:").padEnd(60, '.'), blueText(desc) + "  ", colorFn(numberWithCommas(gasUsed).padStart(5)));
}