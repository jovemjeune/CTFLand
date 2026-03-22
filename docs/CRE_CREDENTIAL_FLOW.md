# CRE + credentials (Triage / Judge NFT)

This repo’s **CRE** `project.yaml` defines RPC targets for workflows (Fuji, Arbitrum Sepolia, etc.). Credential verification itself runs in **Next.js** (`apps/web`): HTTP APIs validate self-attested profile data, issue an OTP, then the **verifier wallet** calls `mintTriageVerified` / `mintJudgeVerified` on the deployed contracts.

## On-chain prerequisites

1. Deploy `TriageNFT` and `JudgeNFT` (see `foundry/`).
2. **Owner** calls `setCredentialVerifier(verifier)` on both contracts with the same address as the backend wallet (`VERIFIER_PRIVATE_KEY` in `.env`).
3. Ensure `NEXT_PUBLIC_CHAIN_ID` and NFT addresses (env or `lib/contract-addresses.json`) match the chain you use.

## HTTP API (for CRE or other orchestrators)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/credentials/challenge` | Body: `{ "role": "triage" \| "judge", "address": "0x…" }` → `{ message, nonce, expiresAt, chainId }` for the wallet to sign. |
| `POST` | `/api/credentials/start` | Body: `{ role, nonce, signature, profile }` → validates profile + signature; issues OTP; optional `demoOtp` if `CREDENTIALS_DEMO_REVEAL_OTP=true`. |
| `POST` | `/api/credentials/confirm` | Body: `{ role, address, otp }` → verifies OTP and submits the mint tx. |

**Profile shape** (self-attested; tighten with manual review or future integrations):

- **Triage:** `platformUrls[]`, `twitterUrl`, `highSeverityCount` (≥ 1), `auditUsdTotal` (≥ 10000).
- **Judge:** `platformUrls[]`, `twitterUrl`, `validBugCount` (≥ 1).

**Twitter / X:** A valid `https://twitter.com/...` or `https://x.com/...` link is required; the UI warns before starting. Sending OTP to an X handle automatically requires **X API** access; demo mode exposes the code in the API response.

## Frontend

- `/triage/apply` — Triage flow.
- `/judges/apply` — Judge flow.

Users who already hold the NFT on the active chain see an immediate “already verified” state via `balanceOf` / `isTriageMember` / `isJudgeMember`.

## CRE workflow idea

A CRE workflow step can `curl` the same endpoints the browser uses: request challenge → (off-chain) collect signature from a controlled wallet → `start` → deliver OTP through your channel → `confirm`. Point RPCs in `project.yaml` at Fuji / Arbitrum Sepolia for state reads if you add on-chain steps alongside HTTP.
