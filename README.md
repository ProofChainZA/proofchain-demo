# ProofChain / FanPass SDK Demo

A single-page app that exercises the published ProofChain SDKs against a live
API. It exists so you can see every SDK call flow working — and watch the exact
request and response — without writing integration code.

Use it to reproduce a customer's problem, sanity-check an SDK release, or learn
what the API actually returns.

New to ProofChain? Read `proofchain-infra/docs/ONBOARDING.md` first.

---

## What it demonstrates

Each tab is one feature area, driven entirely from the browser:

| Tab | Exercises |
|---|---|
| Flow | End-to-end event submission and attestation |
| Consent | Consent grants and revocation |
| Data views | Privacy-preserving windows onto tenant data |
| Events | Raw event submission and querying |
| Wallets | Coinbase CDP embedded wallets (OAuth redirect flow) |
| Wallet SDK | `@proofchain/wallet-sdk` |
| Quests / Leaderboard | Quest progress and FanScore leaderboards |
| OTT | One-time-token redemption |
| Credentials | Verifiable credential issuance |

It consumes the **published npm packages**, not local builds. Testing an
unreleased SDK change means publishing a prerelease or `npm link`-ing by hand.

---

## Quick start

```bash
npm install      # .npmrc sets legacy-peer-deps=true — required, see Gotchas
npm run dev      # http://localhost:3000
```

By default it points at production (`https://api.proofchain.co.za`). Point it at
your local stack instead:

```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
npm run dev
```

API keys are **not** baked in. Enter the integrator key, campaign ID and tenant
API key at runtime through the Config panel. With a local stack, `make seed` in
`proofchain-infra/docker` prints usable credentials.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build — **the only CI gate** |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npx tsc --noEmit` | Typecheck — no npm script exists for it |

There is no test suite.

---

## Code map

```
src/
├── app/
│   ├── layout.tsx        root layout, fonts, globals.css
│   └── page.tsx          ~4,900 lines: every tab, all state, all SDK flows
├── components/
│   ├── ConfigPanel.tsx   API base URL + integrator/tenant key entry
│   ├── LogPanel.tsx      request/response log viewer (LogEntry type)
│   ├── WalletDemo.tsx    CDP embedded-wallet flow (JWT in sessionStorage)
│   └── WalletSdkDemo.tsx @proofchain/wallet-sdk tab
└── lib/sdk.ts            module-level SDK singletons (init/get/clear)
```

Everything is a client component (`'use client'`). There are no API routes and
no server actions — the browser talks to the ProofChain API directly through the
SDKs, which is the point: what you see in the log panel is what a customer's app
would send.

`page.tsx` being one large file is deliberate. Each tab is a self-contained flow
using `useState` + `useCallback`, logging through `LogPanel`. Match that pattern
rather than introducing state management.

Path alias `@/*` → `src/*`.

---

## Gotchas

- **`typescript.ignoreBuildErrors: true`** in `next.config.ts`. There is a known
  React 19 type conflict with the SDKs, so type errors will **not** fail the
  build. Run `npx tsc --noEmit` yourself when it matters.
- **`.npmrc` `legacy-peer-deps=true` is load-bearing** — the CDP packages pin a
  narrow React peer range. The Dockerfile copies `.npmrc` before `npm ci` for the
  same reason. Removing it breaks install.
- **Never commit real keys.** Credentials are runtime-entered by design.
- `claude-doc-sync.yml` opens doc PRs on a schedule; add `[skip-docs]` to a PR
  title to opt out.

---

## Deploy

**Pushing to `main` or `staging` deploys.** `deploy.yml` builds the Docker image
(`output: 'standalone'`) and pushes to ECR (`proofchain-demo-app`, `af-south-1`).
Markdown-only changes are path-ignored.

Runs as the `demo-app` deployment in the `proofchain` namespace.

---

## Related

| Where | What |
|---|---|
| `proofchain-infra/docs/ONBOARDING.md` | Start here if you're new |
| `proofchain-infra/docs/ARCHITECTURE.md` | How the platform fits together |
| `proofchain-sdks/` | Source of the SDKs this app consumes |
| `proofchain-sdks/SDK_FEATURE_MATRIX.md` | Per-SDK API coverage |
| `CLAUDE.md` | Dense per-repo reference |
