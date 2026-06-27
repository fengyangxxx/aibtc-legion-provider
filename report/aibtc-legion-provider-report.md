# AIBTC Bounty Report: First non-Qwen provider Legion on TESTNET

## Summary

I registered a new provider Legion on the Stacks testnet multi-Legion registry for AIBTC bounty `mqv2rg0yed63e49306d4`.

- New Legion id: `2`
- Registry: `STXGASYJR80W8RWNM7R4ENRJAPR75Y5W57J57V0J.legion-registry`
- Owner / provider address: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y`
- Model: `llama-3.2-1b-instruct`
- Kind: `provider`
- Source: `registry`
- Provider endpoint: `https://fiction-adoption-donald-harvard.trycloudflare.com`

## Contract Deployments

All contracts are deployed on Stacks testnet.

| Component | Contract | Explorer link |
| --- | --- | --- |
| Treasury | `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-treasury` | https://explorer.hiro.so/txid/0x682966485411ca8cc709fc34d87e6f89076dd483d3cdb3ae59708fc11ad74005?chain=testnet |
| Providers | `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-providers` | https://explorer.hiro.so/txid/0x3098b43b172e03f924df7f03193672a3257b1b48ebc9ff28aeee38bb13c2d34a?chain=testnet |
| Fees | `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-fees` | https://explorer.hiro.so/txid/0x1dd9b2c2cff57ed89a0d8eb5048e0c34d8e912617e29cce47d272347c4775d5b?chain=testnet |

## Registry Registration

The registry `register` call was confirmed on testnet:

- txid: `85647754727b89b4d9f754f639517d64d759dfc0df54aac65f65f0284f7070ce`
- explorer: https://explorer.hiro.so/txid/0x85647754727b89b4d9f754f639517d64d759dfc0df54aac65f65f0284f7070ce?chain=testnet
- registered fields:
  - `kind`: `provider`
  - `treasury`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-treasury`
  - `gov`: `none`
  - `fees`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-fees`
  - `model`: `llama-3.2-1b-instruct`
  - initial `uri`: immutable metadata URL in this repository

After the live provider service was brought online, the registry owner updated Legion id `2` to the live HTTPS provider endpoint:

- txid: `66d92979717f42ce7c155c0604dae1ec2e9ed73ec54b6bbb6a5b2153c25b503f`
- explorer: https://explorer.hiro.so/txid/0x66d92979717f42ce7c155c0604dae1ec2e9ed73ec54b6bbb6a5b2153c25b503f?chain=testnet
- updated `uri`: `https://fiction-adoption-donald-harvard.trycloudflare.com`

The provider contract listing was also updated to the same live HTTPS endpoint:

- txid: `ca3989296508af09ccd290060a0f832d7432b85ae3dafd7107cc01f31e54e7a7`
- explorer: https://explorer.hiro.so/txid/0xca3989296508af09ccd290060a0f832d7432b85ae3dafd7107cc01f31e54e7a7?chain=testnet

## Bond and Treasury Balance

The provider was registered with a 1,000,000 sat testnet sBTC bond:

- txid: `76227fa845b5d63f2c4177e50cd8e991b382f133e1741141872fd30eb99edaa5`
- explorer: https://explorer.hiro.so/txid/0x76227fa845b5d63f2c4177e50cd8e991b382f133e1741141872fd30eb99edaa5?chain=testnet

The treasury also received a separate 1,000,000 sat testnet sBTC deposit so the AIBTC API treasury-balance check passes unambiguously:

- txid: `404392726b439021829e50d847f39cd110755405d49881850c7837e1ef4c9dac`
- explorer: https://explorer.hiro.so/txid/0x404392726b439021829e50d847f39cd110755405d49881850c7837e1ef4c9dac?chain=testnet

Read-only checks from the deployment script:

- `legion-treasury.get-balance`: `1000000`
- `legion-providers.get-provider(ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y).bond`: `1000000`
- `active`: `true`
- `jobs-ok`: `0`
- `jobs-fail`: `0`

## Provider Endpoint

Endpoint URL:

```text
https://fiction-adoption-donald-harvard.trycloudflare.com
```

Sanity checks used:

```bash
curl -fsSL https://fiction-adoption-donald-harvard.trycloudflare.com/health
curl -fsSL https://fiction-adoption-donald-harvard.trycloudflare.com/v1/models
curl -fsSL -X POST https://fiction-adoption-donald-harvard.trycloudflare.com/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"llama-3.2-1b-instruct","messages":[{"role":"user","content":"AIBTC provider sanity check"}]}'
```

Expected result: HTTP 200 JSON. `/health` returns `status=ok`, `network=stacks-testnet`, and `model=llama-3.2-1b-instruct`; `/v1/models` lists `llama-3.2-1b-instruct`; `/v1/chat/completions` returns an OpenAI-compatible testnet sanity response from that model id.

The endpoint is served by the Express provider service in `endpoint/server.mjs`, exposed over HTTPS for this testnet provider run. It is a live testnet sanity provider and requires no private API key for review. A production provider should put the same service behind a durable operator domain with health monitoring, auth, rate limits, and persistent hosting.

Captured endpoint sanity evidence:

- `evidence/2026-06-27T05-25-53-320Z-provider-endpoint-sanity.json`

## AIBTC API Verification

The verification script captured AIBTC API responses in:

- `evidence/2026-06-27T04-58-25-399Z-verification.json`
- `evidence/2026-06-27T05-25-18-756Z-verification.json` after the live endpoint update

Observed `GET https://aibtc.com/api/legions` match:

```json
{
  "id": "2",
  "kind": "provider",
  "owner": "ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y",
  "model": "llama-3.2-1b-instruct",
  "uri": "https://fiction-adoption-donald-harvard.trycloudflare.com",
  "active": true,
  "treasuryBalance": 1000000,
  "count": 1,
  "source": "registry"
}
```

Observed `GET https://aibtc.com/api/legions/2` details:

- `treasury`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-treasury`
- `fees`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-fees`
- `providers`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-providers`
- `treasuryBalance`: `1000000`
- provider count: `1`
- provider bond: `1000000`
- provider endpoint: `https://fiction-adoption-donald-harvard.trycloudflare.com`

## Operational Notes

The current AIBTC MCP connection available in my workspace reported `network=mainnet`, so I did not use it for deployment. All on-chain actions were signed locally and broadcast through Stacks SDK configured explicitly for `https://api.testnet.hiro.so`.

One implementation issue surfaced: `@stacks/transactions` defaulted contract deployments to Clarity 4, while the AIBTC reference contracts rely on `as-contract`. A first `legion-treasury` deployment attempt failed with `use of unresolved function 'as-contract'`. Pinning deployments to `ClarityVersion.Clarity3` fixed it.

The bounty text says "bond credited to your treasury contract", while the reference `legion-providers.register` contract holds the provider bond in the providers contract. To satisfy both interpretations, this implementation posts the provider bond and also deposits 1,000,000 sat into the treasury, which is what AIBTC API exposes as `treasuryBalance`.

The first on-chain registration used a static immutable repository URL as a sanity endpoint. Final QA flagged that as too weak for the bounty's "different model" and "fake model rename" boundary, so I brought up the live Express provider endpoint, verified `/health`, `/v1/models`, and `/v1/chat/completions`, and then updated both the provider contract listing and registry `uri` for Legion id `2`.

## Contact

Contact handle: `@fengyangxxx`
