import path from 'node:path';

import {
  MODEL,
  REGISTRY,
  ascii,
  callContract,
  contractId,
  ensureDirs,
  evidenceDir,
  getNonce,
  loadOrCreateWallet,
  principal,
  readJson,
  readOnly,
  statePath,
  txUrl,
  uint,
  waitForTx,
  writeJson,
  jsonReplacer,
} from './common.mjs';

const endpoint = process.env.PROVIDER_ENDPOINT;
if (!endpoint || !/^https:\/\/.+/.test(endpoint)) {
  throw new Error('Set PROVIDER_ENDPOINT to the public https provider endpoint.');
}
if (endpoint.length > 256) {
  throw new Error(`Endpoint is ${endpoint.length} chars; Clarity string-ascii limit is 256.`);
}

const legionId = BigInt(process.env.LEGION_ID ?? '2');

await ensureDirs();
const wallet = await loadOrCreateWallet();
let state = (await readJson(statePath, {})) ?? {};
state.providerEndpoint = endpoint;
state.model = MODEL;
state.registryLegionId = legionId.toString();
state.endpointUpdatedAt = new Date().toISOString();
state.transactions = state.transactions ?? [];

async function recordTx(label, txid, body) {
  const record = {
    label,
    txid,
    explorer: txUrl(txid),
    confirmedAt: new Date().toISOString(),
    status: body.tx_status,
    blockHeight: body.block_height,
  };
  state.transactions.push(record);
  await writeJson(statePath, state);
  await writeJson(path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${label}.json`), {
    endpoint,
    legionId,
    record,
    tx: body,
  });
  console.log(JSON.stringify(record, null, 2));
}

async function sendAndConfirm(label, sender, fn) {
  const nonce = await getNonce(sender);
  const result = await fn(nonce);
  if (result.response?.error) {
    throw new Error(`${label} broadcast error: ${JSON.stringify(result.response)}`);
  }
  const body = await waitForTx(result.txid, label);
  await recordTx(label, result.txid, body);
  return result.txid;
}

const providersId = contractId(wallet.address, 'legion-providers');

await sendAndConfirm('provider-set-listing-real-endpoint', wallet.address, nonce =>
  callContract({
    senderKey: wallet.privateKey,
    nonce,
    contractAddress: wallet.address,
    contractName: 'legion-providers',
    functionName: 'set-listing',
    functionArgs: [
      ascii(MODEL),
      ascii(endpoint),
    ],
  })
);

await sendAndConfirm('registry-set-uri-real-endpoint', wallet.address, nonce =>
  callContract({
    senderKey: wallet.privateKey,
    nonce,
    contractAddress: REGISTRY.address,
    contractName: REGISTRY.contractName,
    functionName: 'set-uri',
    functionArgs: [
      uint(legionId),
      ascii(endpoint),
    ],
  })
);

state.readOnly = {
  ...state.readOnly,
  provider: await readOnly({
    contractAddress: wallet.address,
    contractName: 'legion-providers',
    functionName: 'get-provider',
    functionArgs: [principal(wallet.address)],
    senderAddress: wallet.address,
  }),
  registryLegion: await readOnly({
    contractAddress: REGISTRY.address,
    contractName: REGISTRY.contractName,
    functionName: 'get-legion',
    functionArgs: [uint(legionId)],
    senderAddress: wallet.address,
  }),
};
state.contracts = {
  ...state.contracts,
  'legion-providers': {
    ...(state.contracts?.['legion-providers'] ?? {}),
    id: providersId,
  },
};
state.updatedAt = new Date().toISOString();
await writeJson(statePath, state);

console.log(JSON.stringify({
  done: true,
  endpoint,
  legionId,
  readOnly: state.readOnly,
}, jsonReplacer, 2));
