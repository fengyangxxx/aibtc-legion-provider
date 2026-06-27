import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNetwork } from '@stacks/network';
import {
  AnchorMode,
  Cl,
  ClarityVersion,
  PostConditionMode,
  broadcastTransaction,
  cvToJSON,
  cvToValue,
  fetchCallReadOnlyFunction,
  getAddressFromPrivateKey,
  makeContractCall,
  makeContractDeploy,
  makeRandomPrivKey,
  principalCV,
  serializeTransactionBytes,
  stringAsciiCV,
  txidFromData,
  uintCV,
} from '@stacks/transactions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectDir = path.resolve(__dirname, '..');
export const repoDir = path.resolve(projectDir, '..', '..');
export const evidenceDir = path.join(projectDir, 'evidence');
export const reportDir = path.join(projectDir, 'report');
export const secretsDir = path.join(repoDir, '.secrets');
export const walletPath = path.join(secretsDir, 'aibtc-legion-testnet-wallet.json');
export const statePath = path.join(evidenceDir, 'deployment-state.json');

export const network = createNetwork({
  network: 'testnet',
  client: { baseUrl: 'https://api.testnet.hiro.so' },
});

export const API_BASE = network.client.baseUrl;
export const REGISTRY = {
  address: 'STXGASYJR80W8RWNM7R4ENRJAPR75Y5W57J57V0J',
  contractName: 'legion-registry',
};
export const SBTC = {
  address: 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2',
  contractName: 'sbtc-token',
};
export const MODEL = 'llama-3.2-1b-instruct';
export const BOND_AMOUNT = 1000000n;

export function txUrl(txid) {
  const id = txid.startsWith('0x') ? txid : `0x${txid}`;
  return `https://explorer.hiro.so/txid/${id}?chain=testnet`;
}

export function contractId(address, contractName) {
  return `${address}.${contractName}`;
}

export async function ensureDirs() {
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(secretsDir, { recursive: true });
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, jsonReplacer, 2)}\n`, 'utf8');
}

export function jsonReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export async function loadOrCreateWallet() {
  await ensureDirs();
  const existing = await readJson(walletPath);
  if (existing?.privateKey) {
    return {
      privateKey: existing.privateKey,
      address: getAddressFromPrivateKey(existing.privateKey, network),
      createdAt: existing.createdAt,
    };
  }

  const privateKey = makeRandomPrivKey();
  const address = getAddressFromPrivateKey(privateKey, network);
  await writeJson(walletPath, {
    network: 'stacks-testnet',
    address,
    privateKey,
    createdAt: new Date().toISOString(),
    note: 'AIBTC Legion provider bounty testnet wallet. Do not print or commit the privateKey.',
  });
  return { privateKey, address, createdAt: new Date().toISOString() };
}

export async function getAccount(address) {
  const response = await fetch(`${API_BASE}/extended/v1/address/${address}/balances`);
  if (!response.ok) {
    throw new Error(`balances HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function getNonce(address) {
  const response = await fetch(`${API_BASE}/v2/accounts/${address}?proof=0`);
  if (!response.ok) {
    throw new Error(`account nonce HTTP ${response.status}: ${await response.text()}`);
  }
  const body = await response.json();
  return BigInt(body.nonce);
}

export async function requestStxFaucet(address) {
  const urls = [
    `${API_BASE}/extended/v1/faucets/stx?address=${encodeURIComponent(address)}`,
    `${API_BASE}/extended/v1/faucets/stx`,
  ];
  const results = [];
  for (const url of urls) {
    const init = url.endsWith('/stx')
      ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) }
      : { method: 'POST' };
    const response = await fetch(url, init);
    const text = await response.text();
    results.push({ url, status: response.status, body: safeJson(text) ?? text.slice(0, 500) });
    if (response.ok) return results;
  }
  throw new Error(`STX faucet failed: ${JSON.stringify(results)}`);
}

export function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function broadcast(tx) {
  const response = await broadcastTransaction({ transaction: tx, network });
  const returnedTxid = typeof response === 'string'
    ? response
    : response?.txid ?? response?.txId;
  const localTxid = txidFromData(serializeTransactionBytes(tx));
  const txid = returnedTxid ?? localTxid;
  return {
    txid: String(txid).startsWith('0x') ? String(txid).slice(2) : String(txid),
    response,
  };
}

export async function waitForTx(txid, label, timeoutMs = 30 * 60 * 1000) {
  const started = Date.now();
  const id = txid.startsWith('0x') ? txid.slice(2) : txid;
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${API_BASE}/extended/v1/tx/0x${id}`);
    if (response.ok) {
      const body = await response.json();
      if (body.tx_status === 'success') return body;
      if (['abort_by_response', 'abort_by_post_condition', 'dropped_replace_by_fee', 'dropped_replace_across_fork', 'dropped_too_expensive', 'dropped_stale_garbage_collect'].includes(body.tx_status)) {
        throw new Error(`${label} failed with ${body.tx_status}: ${JSON.stringify(body, jsonReplacer).slice(0, 2000)}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  throw new Error(`${label} not confirmed before timeout: ${txid}`);
}

export async function deployContract({ senderKey, nonce, name, codeBody, fee = 200000n }) {
  const tx = await makeContractDeploy({
    contractName: name,
    codeBody,
    clarityVersion: ClarityVersion.Clarity3,
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    nonce,
    fee,
  });
  return broadcast(tx);
}

export async function callContract({ senderKey, nonce, contractAddress, contractName, functionName, functionArgs, fee = 80000n }) {
  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    nonce,
    fee,
  });
  return broadcast(tx);
}

export async function readOnly({ contractAddress, contractName, functionName, functionArgs = [], senderAddress }) {
  const result = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderAddress,
    network,
  });
  return {
    raw: cvToJSON(result),
    value: cvToValue(result),
  };
}

export async function readContractSource(fileName) {
  return fs.readFile(path.join(projectDir, 'contracts', fileName), 'utf8');
}

export function principal(id) {
  return principalCV(id);
}

export function ascii(value) {
  return stringAsciiCV(value);
}

export function uint(value) {
  return uintCV(value);
}

export function none() {
  return Cl.none();
}

export function some(value) {
  return Cl.some(value);
}
