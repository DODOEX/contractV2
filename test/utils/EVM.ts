/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

// require('dotenv-flow').config();

import { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers';
import Web3 from 'web3';

export function getDefaultWeb3() {
  return new Web3(process.env.RPC_NODE_URI)
}

export class EVM {
  private provider = new Web3.providers.HttpProvider(process.env.RPC_NODE_URI);

  public async reset(id: string): Promise<string> {
    if (!id) {
      throw new Error('id must be set');
    }

    await this.callJsonrpcMethod('evm_revert', [id]);

    return this.snapshot();
  }

  public async snapshot(): Promise<string> {
    return this.callJsonrpcMethod('evm_snapshot');
  }

  public async evmRevert(id: string): Promise<string> {
    return this.callJsonrpcMethod('evm_revert', [id]);
  }

  public async stopMining(): Promise<string> {
    return this.callJsonrpcMethod('miner_stop');
  }

  public async startMining(): Promise<string> {
    return this.callJsonrpcMethod('miner_start');
  }

  public async mineBlock(): Promise<string> {
    return this.callJsonrpcMethod('evm_mine');
  }

  public async fastMove(moveBlockNum: number): Promise<string> {
    var res: string
    for (let i = 0; i < moveBlockNum; i++) {
      res = await this.callJsonrpcMethod('evm_mine');
    }
    return res
  }

  public async increaseTime(duration: number): Promise<string> {
    await this.callJsonrpcMethod('evm_increaseTime', [duration]);
    return this.callJsonrpcMethod('evm_mine');
  }

  public async callJsonrpcMethod(method: string, params?: (any[])): Promise<string> {
    const args: JsonRpcPayload = {
      method,
      params,
      jsonrpc: '2.0',
      id: new Date().getTime(),
    };

    const response = await this.send(args);

    return response.result;
  }

  private async send(args: JsonRpcPayload): Promise<any> {
    return new Promise((resolve, reject) => {
      const callback: any = (error: Error, val: JsonRpcResponse): void => {
        if (error) {
          reject(error);
        } else {
          resolve(val);
        }
      };

      this.provider.send(
        args,
        callback,
      );
    });
  }
}
