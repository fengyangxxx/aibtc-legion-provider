# AIBTC non-Qwen provider Legion, TESTNET

This repository is the public artifact for AIBTC bounty `mqv2rg0yed63e49306d4`: first non-Qwen provider Legion registered on the multi-Legion registry on Stacks testnet.

## Provider endpoint

The live provider sanity endpoint is:

```text
https://fiction-adoption-donald-harvard.trycloudflare.com
```

The service is implemented in `endpoint/server.mjs` and exposes:

- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions`

Sanity check:

```bash
curl -fsSL <PROVIDER_ENDPOINT_URL>
```

Expected result: HTTP 200 JSON with:

- `status=ok`
- `network=stacks-testnet`
- `model=llama-3.2-1b-instruct`
- `providerAddress=ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y`

## Contracts

Contracts are deployed on Stacks testnet:

- `legion-treasury`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-treasury`
- `legion-providers`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-providers`
- `legion-fees`: `ST172BJD7XQ4J2NN8SXWC7R9WTMCX32JW03JGR29Y.legion-fees`

The contracts are based on the current AIBTC provider Legion interface:

- `legion-treasury.get-balance`
- `legion-providers.register(ft, model, endpoint, bond)`
- `legion-providers.get-provider(provider)`
- `legion-fees.route(ft, amount, to)`

## Registry

The provider Legion is registered with:

- registry: `STXGASYJR80W8RWNM7R4ENRJAPR75Y5W57J57V0J.legion-registry`
- registry id: `2`
- `kind`: `provider`
- `model`: `llama-3.2-1b-instruct`
- `uri`: live provider endpoint URL

## Bond and treasury balance

The bounty asks for a 1,000,000 sat minimum testnet sBTC bond and for `/api/legions/{id}` to show a treasury balance of at least 1,000,000 sats.

To avoid ambiguity in the current contract/API interpretation, this implementation does both:

- posts a 1,000,000 sat provider bond through `legion-providers.register`
- separately deposits 1,000,000 sat testnet sBTC into `legion-treasury.deposit`

Verified AIBTC API snapshot:

- `GET https://aibtc.com/api/legions` shows id `2`, `source=registry`, `kind=provider`, model `llama-3.2-1b-instruct`, `uri=https://fiction-adoption-donald-harvard.trycloudflare.com`, and `treasuryBalance=1000000`.
- `GET https://aibtc.com/api/legions/2` shows treasury balance `1000000` and one provider with bond `1000000`, active `true`, and the live provider endpoint URL.

## Transaction links

- treasury deploy: https://explorer.hiro.so/txid/0x682966485411ca8cc709fc34d87e6f89076dd483d3cdb3ae59708fc11ad74005?chain=testnet
- providers deploy: https://explorer.hiro.so/txid/0x3098b43b172e03f924df7f03193672a3257b1b48ebc9ff28aeee38bb13c2d34a?chain=testnet
- fees deploy: https://explorer.hiro.so/txid/0x1dd9b2c2cff57ed89a0d8eb5048e0c34d8e912617e29cce47d272347c4775d5b?chain=testnet
- treasury set-token: https://explorer.hiro.so/txid/0xc5537719425b20b15ed7181fa8686715c31c46b5508ad4387cec19a13e3afda7?chain=testnet
- providers set-token: https://explorer.hiro.so/txid/0x152e3dfcbf7b8b0ea9f8e1c073b1deeada027d2f445981a8f9298bef0630defa?chain=testnet
- testnet sBTC faucet: https://explorer.hiro.so/txid/0xe377c5e98735e9279c2763f570362e332a1435f7f8090ce5d11e5170c62374a6?chain=testnet
- provider register and 1,000,000 sat bond: https://explorer.hiro.so/txid/0x76227fa845b5d63f2c4177e50cd8e991b382f133e1741141872fd30eb99edaa5?chain=testnet
- treasury deposit 1,000,000 sat: https://explorer.hiro.so/txid/0x404392726b439021829e50d847f39cd110755405d49881850c7837e1ef4c9dac?chain=testnet
- registry register: https://explorer.hiro.so/txid/0x85647754727b89b4d9f754f639517d64d759dfc0df54aac65f65f0284f7070ce?chain=testnet
- provider listing update to live endpoint: https://explorer.hiro.so/txid/0xca3989296508af09ccd290060a0f832d7432b85ae3dafd7107cc01f31e54e7a7?chain=testnet
- registry URI update to live endpoint: https://explorer.hiro.so/txid/0x66d92979717f42ce7c155c0604dae1ec2e9ed73ec54b6bbb6a5b2153c25b503f?chain=testnet

## Operational notes

The current AIBTC MCP connection available in this workspace reports `network=mainnet`, so it is intentionally not used for any deployment or registration transaction. All chain actions use Stacks SDK configured explicitly for `https://api.testnet.hiro.so`.

One implementation gotcha: `@stacks/transactions` currently defaults contract deploys to Clarity 4, but the AIBTC reference contracts use `as-contract`. A first deployment attempt failed with `use of unresolved function 'as-contract'`; the deploy script now pins contract deploys to `ClarityVersion.Clarity3`.

The current endpoint is a live testnet sanity provider exposed over HTTPS. A production provider should put the same service behind a durable operator domain and add auth, rate limits, logs, health monitoring, and restart supervision.
