/*
  This file is part of web3x.

  web3x is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  web3x is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with web3x.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Address } from '../address';
import { GetLogOptions, Log, Sync, Transaction, TransactionReceipt } from '../formatters';
import { LegacyProvider, LegacyProviderAdapter } from '../providers';
import { EthereumProvider } from '../providers/ethereum-provider';
import { Subscription } from '../subscriptions';
import { TransactionHash } from '../types';
import { Data, Quantity } from '../types';
import { Wallet } from '../wallet';
import { Block, BlockHash, BlockHeader, BlockType } from './block';
import { EthRequestPayloads } from './eth-request-payloads';
import { SendSignedTransaction, SendTransaction, SendTx } from './send-tx';
import { subscribeForLogs } from './subscriptions/logs';
import { subscribeForNewHeads } from './subscriptions/new-heads';
import { subscribeForNewPendingTransactions } from './subscriptions/new-pending-transactions';
import { subscribeForSyncing } from './subscriptions/syncing';
import { SignedTransaction, Tx } from './tx';

declare const web3: { currentProvider?: LegacyProvider; ethereumProvider?: LegacyProvider } | undefined;

export type TypedSigningData = { type: string; name: string; value: string }[];

export class Eth {
  public readonly request: EthRequestPayloads;
  public wallet?: Wallet;

  constructor(readonly provider: EthereumProvider) {
    this.request = new EthRequestPayloads(undefined, 'latest');
  }

  public static fromCurrentProvider() {
    if (!web3) {
      return;
    }
    const provider = web3.currentProvider || web3.ethereumProvider;
    if (!provider) {
      return;
    }
    return new Eth(new LegacyProviderAdapter(provider));
  }

  public get defaultFromAddress(): Address | undefined {
    return this.request.defaultFromAddress;
  }

  public set defaultFromAddress(address: Address | undefined) {
    this.request.defaultFromAddress = address;
  }

  private async send({ method, params, format }: { method: string; params?: any[]; format: any }) {
    return format(await this.provider.send(method, params));
  }

  public async getId(): Promise<number> {
    return await this.send(this.request.getId());
  }

  public async getNodeInfo(): Promise<string> {
    return await this.send(this.request.getNodeInfo());
  }

  public async getProtocolVersion(): Promise<string> {
    return await this.send(this.request.getProtocolVersion());
  }

  public async getCoinbase(): Promise<Address> {
    return await this.send(this.request.getCoinbase());
  }

  public async isMining(): Promise<boolean> {
    return await this.send(this.request.isMining());
  }

  public async getHashrate(): Promise<number> {
    return await this.send(this.request.getHashrate());
  }

  public async isSyncing(): Promise<Sync | boolean> {
    return await this.send(this.request.isSyncing());
  }

  public async getGasPrice(): Promise<Quantity> {
    return await this.send(this.request.getGasPrice());
  }

  public async getAccounts(): Promise<Address[]> {
    return await this.send(this.request.getAccounts());
  }

  public async getBlockNumber(): Promise<number> {
    return await this.send(this.request.getBlockNumber());
  }

  public async getBalance(address: Address, block?: BlockType): Promise<Quantity> {
    return await this.send(this.request.getBalance(address, block));
  }

  public async getStorageAt(address: Address, position: string, block?: BlockType): Promise<Data> {
    return await this.send(this.request.getStorageAt(address, position, block));
  }

  public async getCode(address: Address, block?: BlockType): Promise<Data> {
    return await this.send(this.request.getCode(address, block));
  }

  public async getBlock(block: BlockType | BlockHash, returnTransactionObjects: boolean = false): Promise<Block> {
    return await this.send(this.request.getBlock(block, returnTransactionObjects));
  }

  public async getUncle(
    block: BlockType | BlockHash,
    uncleIndex: number,
    returnTransactionObjects: boolean = false,
  ): Promise<Block> {
    return await this.send(this.request.getUncle(block, uncleIndex, returnTransactionObjects));
  }

  public async getBlockTransactionCount(block: BlockType | BlockHash): Promise<number> {
    return await this.send(this.request.getBlockTransactionCount(block));
  }

  public async getBlockUncleCount(block: BlockType | BlockHash): Promise<number> {
    return await this.send(this.request.getBlockUncleCount(block));
  }

  public async getTransaction(hash: TransactionHash): Promise<Transaction> {
    return await this.send(this.request.getTransaction(hash));
  }

  public async getTransactionFromBlock(block: BlockType | BlockHash, index: number): Promise<Transaction> {
    return await this.send(this.request.getTransactionFromBlock(block, index));
  }

  public async getTransactionReceipt(txHash: TransactionHash): Promise<TransactionReceipt | null> {
    return await this.send(this.request.getTransactionReceipt(txHash));
  }

  public async getTransactionCount(address: Address, block?: BlockType): Promise<number> {
    return await this.send(this.request.getTransactionCount(address, block));
  }

  public async signTransaction(tx: Tx): Promise<SignedTransaction> {
    return await this.send(this.request.signTransaction(tx));
  }

  public sendSignedTransaction(data: Data): SendTx {
    return new SendSignedTransaction(this, this.request.sendSignedTransaction(data));
  }

  public sendTransaction(tx: Tx): SendTx {
    return new SendTransaction(this, tx);
  }

  private getAccount(address?: Address) {
    address = address || this.defaultFromAddress;
    if (this.wallet && address) {
      return this.wallet.get(address);
    }
  }

  public async sign(address: Address, dataToSign: Data): Promise<Data> {
    const account = this.getAccount(address);

    if (!account) {
      return await this.send(this.request.sign(address, dataToSign));
    } else {
      const sig = account.sign(dataToSign);
      return sig.signature;
    }
  }

  public async signTypedData(address: Address, dataToSign: TypedSigningData): Promise<Data> {
    return await this.send(this.request.signTypedData(address, dataToSign));
  }

  public async call(tx: Tx, block?: BlockType): Promise<Data> {
    return await this.send(this.request.call(tx, block));
  }

  public async estimateGas(tx: Tx): Promise<number> {
    return await this.send(this.request.estimateGas(tx));
  }

  public async submitWork(nonce: string, powHash: string, digest: string): Promise<boolean> {
    return await this.send(this.request.submitWork(nonce, powHash, digest));
  }

  public async getWork(): Promise<string[]> {
    return await this.send(this.request.getWork());
  }

  public async getPastLogs(options: GetLogOptions): Promise<Log[]> {
    return await this.send(this.request.getPastLogs(options));
  }

  public subscribe(type: 'logs', options?: GetLogOptions): Subscription<Log>;
  public subscribe(type: 'syncing'): Subscription<object | boolean>;
  public subscribe(type: 'newBlockHeaders'): Subscription<BlockHeader>;
  public subscribe(type: 'pendingTransactions'): Subscription<Transaction>;
  public subscribe(
    type: 'pendingTransactions' | 'newBlockHeaders' | 'syncing' | 'logs',
    ...args: any[]
  ): Subscription<any> {
    switch (type) {
      case 'logs':
        return subscribeForLogs(this, ...args);
      case 'syncing':
        return subscribeForSyncing(this.provider);
      case 'newBlockHeaders':
        return subscribeForNewHeads(this.provider);
      case 'pendingTransactions':
        return subscribeForNewPendingTransactions(this.provider);
      default:
        throw new Error(`Unknown subscription type: ${type}`);
    }
  }
}
