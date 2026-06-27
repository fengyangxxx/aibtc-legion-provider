import path from 'node:path';
import {
  API_BASE,
  BOND_AMOUNT,
  MODEL,
  evidenceDir,
  readJson,
  statePath,
  writeJson,
} from './common.mjs';

const state = await readJson(statePath);
if (!state) throw new Error(`Missing deployment state: ${statePath}`);

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { url, status: response.status, ok: response.ok, body };
}

const endpointProbe = await fetchJson(state.providerEndpoint);
const legions = await fetchJson('https://aibtc.com/api/legions');
const entries = Array.isArray(legions.body) ? legions.body : (legions.body?.legions ?? []);
const match = entries.find(item =>
  item?.source === 'registry' &&
  item?.kind === 'provider' &&
  item?.owner === state.deployer &&
  item?.model === MODEL
);
const detail = match?.id ? await fetchJson(`https://aibtc.com/api/legions/${match.id}`) : null;

const treasuryBalance = BigInt(state.readOnly?.treasuryBalance?.value ?? 0);
const providerTuple = state.readOnly?.provider?.value?.value ?? state.readOnly?.provider?.value ?? {};
const providerBond = BigInt(providerTuple?.bond?.value ?? providerTuple?.bond ?? 0);
const checks = {
  endpointHttps: /^https:\/\//.test(state.providerEndpoint),
  endpointOk: endpointProbe.ok,
  modelIsNonQwen: MODEL !== 'qwen2.5-7b',
  treasuryReadOnlyBalanceAtLeast1m: treasuryBalance >= BOND_AMOUNT,
  providerBondAtLeast1m: providerBond >= BOND_AMOUNT,
  aibtcListShowsRegistryProvider: Boolean(match),
  aibtcDetailFetched: Boolean(detail?.ok),
};

const result = {
  verifiedAt: new Date().toISOString(),
  apiBase: API_BASE,
  state,
  endpointProbe,
  aibtcLegions: legions,
  matchedLegion: match ?? null,
  aibtcLegionDetail: detail,
  checks,
};

const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-verification.json`);
await writeJson(file, result);
console.log(JSON.stringify({ file, checks, matchedLegionId: match?.id ?? null }, null, 2));
