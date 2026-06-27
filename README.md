# AIBTC non-Qwen provider Legion, TESTNET

This repository is the public artifact for AIBTC bounty `mqv2rg0yed63e49306d4`: first non-Qwen provider Legion registered on the multi-Legion registry on Stacks testnet.

## Provider endpoint

The provider sanity endpoint is `endpoint/v1.json`. The on-chain registration uses an immutable `raw.githubusercontent.com` URL pinned to the commit that contains this file.

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

- `legion-treasury`: pending deployment
- `legion-providers`: pending deployment
- `legion-fees`: pending deployment

The contracts are based on the current AIBTC provider Legion interface:

- `legion-treasury.get-balance`
- `legion-providers.register(ft, model, endpoint, bond)`
- `legion-providers.get-provider(provider)`
- `legion-fees.route(ft, amount, to)`

## Registry

The provider Legion will be registered with:

- registry: `STXGASYJR80W8RWNM7R4ENRJAPR75Y5W57J57V0J.legion-registry`
- `kind`: `provider`
- `model`: `llama-3.2-1b-instruct`
- `uri`: same immutable provider endpoint URL

## Bond and treasury balance

The bounty asks for a 1,000,000 sat minimum testnet sBTC bond and for `/api/legions/{id}` to show a treasury balance of at least 1,000,000 sats.

To avoid ambiguity in the current contract/API interpretation, this implementation does both:

- posts a 1,000,000 sat provider bond through `legion-providers.register`
- separately deposits 1,000,000 sat testnet sBTC into `legion-treasury.deposit`

## Operational notes

The current AIBTC MCP connection available in this workspace reports `network=mainnet`, so it is intentionally not used for any deployment or registration transaction. All chain actions use Stacks SDK configured explicitly for `https://api.testnet.hiro.so`.

The endpoint is static and public by design. It is a durable sanity endpoint for bounty verification, not a production inference service. A production provider should replace it with an OpenAI-compatible HTTPS service backed by a real non-Qwen model and add health, auth, rate limits, and operational monitoring.
