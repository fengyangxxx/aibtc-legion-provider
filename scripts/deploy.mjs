import path from 'node:path';

import {
  API_BASE,
  BOND_AMOUNT,
  MODEL,
  REGISTRY,
  SBTC,
  ascii,
  callContract,
  contractId,
  deployContract,
  ensureDirs,
  evidenceDir,
  getNonce,
  loadOrCreateWallet,
  none,
  principal,
  readContractSource,
  readJson,
  readOnly,
  some,
  statePath,
  txUrl,
  uint,
  waitForTx,
  writeJson,
} from './common.mjs';

const endpoint = process.env.PROVIDER_ENDPOINT;
if (!endpoint || !/^https:\/\/.+/.test(endpoint)) {
  throw new Error('Set PROVIDER_ENDPOINT to a public https endpoint before deployment.');
}

await ensureDirs();
const wallet = await loadOrCreateWallet();
let state = (await readJson(statePath, {})) ?? {};
state.network = 'stacks-testnet';
state.apiBase = API_BASE;
state.deployer = wallet.address;
state.providerEndpoint = endpoint;
state.model = MODEL;
state.contracts = state.contracts ?? {};
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

const deployOrder = [
  ['legion-treasury', 'legion-treasury.clar'],
  ['legion-providers', 'legion-providers.clar'],
  ['legion-fees', 'legion-fees.clar'],
];

for (const [name, file] of deployOrder) {
  if (!state.contracts[name]?.deployTxid) {
    const codeBody = await readContractSource(file);
    const txid = await sendAndConfirm(`deploy-${name}`, wallet.address, nonce =>
      deployContract({ senderKey: wallet.privateKey, nonce, name, codeBody })
    );
    state.contracts[name] = {
      id: contractId(wallet.address, name),
      deployTxid: txid,
      explorer: txUrl(txid),
    };
    await writeJson(statePath, state);
  }
}

const treasuryId = contractId(wallet.address, 'legion-treasury');
const providersId = contractId(wallet.address, 'legion-providers');
const feesId = contractId(wallet.address, 'legion-fees');
const sbtcId = contractId(SBTC.address, SBTC.contractName);
state.contracts['legion-treasury'].id = treasuryId;
state.contracts['legion-providers'].id = providersId;
state.contracts['legion-fees'].id = feesId;
await writeJson(statePath, state);

const completed = new Set(state.transactions.map(t => t.label));

if (!completed.has('treasury-set-token')) {
  await sendAndConfirm('treasury-set-token', wallet.address, nonce =>
    callContract({
      senderKey: wallet.privateKey,
      nonce,
      contractAddress: wallet.address,
      contractName: 'legion-treasury',
      functionName: 'set-token',
      functionArgs: [principal(sbtcId)],
    })
  );
}

if (!completed.has('providers-set-token')) {
  await sendAndConfirm('providers-set-token', wallet.address, nonce =>
    callContract({
      senderKey: wallet.privateKey,
      nonce,
      contractAddress: wallet.address,
      contractName: 'legion-providers',
      functionName: 'set-token',
      functionArgs: [principal(sbtcId)],
    })
  );
}

if (!completed.has('sbtc-faucet')) {
  await sendAndConfirm('sbtc-faucet', wallet.address, nonce =>
    callContract({
      senderKey: wallet.privateKey,
      nonce,
      contractAddress: SBTC.address,
      contractName: SBTC.contractName,
      functionName: 'faucet',
      functionArgs: [],
    })
  );
}

if (!completed.has('provider-register-bond')) {
  await sendAndConfirm('provider-register-bond', wallet.address, nonce =>
    callContract({
      senderKey: wallet.privateKey,
      nonce,
      contractAddress: wallet.address,
      contractName: 'legion-providers',
      functionName: 'register',
      functionArgs: [
        principal(sbtcId),
        ascii(MODEL),
        ascii(endpoint),
        uint(BOND_AMOUNT),
      ],
    })
  );
}

if (!completed.has('treasury-deposit-1m')) {
  await sendAndConfirm('treasury-deposit-1m', wallet.address, nonce =>
    callContract({
      senderKey: wallet.privateKey,
      nonce,
      contractAddress: wallet.address,
      contractName: 'legion-treasury',
      functionName: 'deposit',
      functionArgs: [
        principal(sbtcId),
        uint(BOND_AMOUNT),
      ],
    })
  );
}

if (!completed.has('registry-register-provider')) {
  await sendAndConfirm('registry-register-provider', wallet.address, nonce =>
    callContract({
      senderKey: wallet.privateKey,
      nonce,
      contractAddress: REGISTRY.address,
      contractName: REGISTRY.contractName,
      functionName: 'register',
      functionArgs: [
        ascii('provider'),
        principal(treasuryId),
        none(),
        some(principal(feesId)),
        ascii(MODEL),
        ascii(endpoint),
      ],
    })
  );
}

state.readOnly = {
  treasuryBalance: await readOnly({
    contractAddress: wallet.address,
    contractName: 'legion-treasury',
    functionName: 'get-balance',
    senderAddress: wallet.address,
  }),
  provider: await readOnly({
    contractAddress: wallet.address,
    contractName: 'legion-providers',
    functionName: 'get-provider',
    functionArgs: [principal(wallet.address)],
    senderAddress: wallet.address,
  }),
  registryCount: await readOnly({
    contractAddress: REGISTRY.address,
    contractName: REGISTRY.contractName,
    functionName: 'get-count',
    senderAddress: wallet.address,
  }),
};
state.updatedAt = new Date().toISOString();
await writeJson(statePath, state);
console.log(JSON.stringify({
  done: true,
  statePath,
  deployer: wallet.address,
  contracts: state.contracts,
  readOnly: state.readOnly,
}, null, 2));
