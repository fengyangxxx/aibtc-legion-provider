import { getAccount, loadOrCreateWallet, requestStxFaucet, writeJson, evidenceDir } from './common.mjs';
import path from 'node:path';

const wallet = await loadOrCreateWallet();
const balancesBefore = await getAccount(wallet.address);
let faucet = null;

if (process.argv.includes('--faucet-stx')) {
  faucet = await requestStxFaucet(wallet.address);
}

const balancesAfter = await getAccount(wallet.address);
const evidence = {
  generatedAt: new Date().toISOString(),
  network: 'stacks-testnet',
  address: wallet.address,
  balancesBefore,
  faucet,
  balancesAfter,
};

await writeJson(path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-wallet-status.json`), evidence);
console.log(JSON.stringify({
  network: 'stacks-testnet',
  address: wallet.address,
  stxBalanceMicrostx: balancesAfter.stx?.balance,
  faucetRequested: Boolean(faucet),
}, null, 2));
