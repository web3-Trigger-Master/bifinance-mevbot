import levelup, { LevelUp } from 'levelup';
import { Address } from '../../address';
import {
  fromRawCallRequest,
  fromRawLogRequest,
  fromRawTransactionRequest,
  toRawLogResponse,
  toRawTransactionReceipt,
} from '../../formatters';
import { EthereumProvider, EthereumProviderNotifications } from '../../providers';
import { bufferToHex, numberToHex } from '../../utils';
import { Blockchain } from '../blockchain';
import { getAccountCode } from '../vm';
import { WorldState } from '../world/world-state';
import { handleCall } from './handle-call';
import { getLogs } from './handle-get-logs';
import { handleGetTransactionReceipt } from './handle-get-transaction-receipt';
import { handleSendTransaction } from './handle-send-transaction';

export class EvmProvider implements EthereumProvider {
  constructor(public readonly worldState: WorldState, private readonly blockchain: Blockchain) {}

  public static async fromDb(db: LevelUp) {
    const worldState = await WorldState.fromDb(db);
    const blockchain = await Blockchain.fromDb(db);
    return new EvmProvider(worldState, blockchain);
  }

  public static async fromLocalDb(name: string) {
    const leveljs = require('level-js');
    return await EvmProvider.fromDb(levelup(leveljs(name)));
  }

  public async send(method: string, params?: any[] | undefined): Promise<any> {
    // console.log(method);
    // console.log(params);

    switch (method) {
      case 'eth_gasPrice':
        return numberToHex(50000);
    }

    if (!params || !params[0]) {
      throw new Error();
    }

    switch (method) {
      case 'eth_sendTransaction':
        return await handleSendTransaction(this.worldState, this.blockchain, fromRawTransactionRequest(params[0]));
      case 'eth_call':
        return bufferToHex(await handleCall(this.worldState, fromRawCallRequest(params[0])));
      case 'eth_getTransactionReceipt':
        return toRawTransactionReceipt(await handleGetTransactionReceipt(this.blockchain, params[0]));
      case 'eth_getCode':
        return bufferToHex(await getAccountCode(this.worldState, Address.fromString(params![0])));
      case 'eth_getLogs':
        return (await getLogs(this.blockchain, fromRawLogRequest(params![0]))).map(toRawLogResponse);
    }
  }

  public on(notification: 'notification', listener: (result: any) => void): this;
  public on(notification: 'connect', listener: () => void): this;
  public on(notification: 'close', listener: (code: number, reason: string) => void): this;
  public on(notification: 'networkChanged', listener: (networkId: string) => void): this;
  public on(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
  public on(notification: any, listener: any): this {
    throw new Error('Method not implemented.');
  }

  public removeListener(notification: 'notification', listener: (result: any) => void): this;
  public removeListener(notification: 'connect', listener: () => void): this;
  public removeListener(notification: 'close', listener: (code: number, reason: string) => void): this;
  public removeListener(notification: 'networkChanged', listener: (networkId: string) => void): this;
  public removeListener(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
  public removeListener(notification: any, listener: any): this {
    throw new Error('Method not implemented.');
  }

  public removeAllListeners(notification: EthereumProviderNotifications): any {
    throw new Error('Method not implemented.');
  }
}
