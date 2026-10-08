# Smart Electricity Bill Management System

**Created by Sanchit Nayyar**

Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.
5. Install [Deno](https://docs.deno.com/runtime/getting_started/installation/) — the local Base44 backend runs on it.

Run `base44 --help` (or see the [CLI reference](https://docs.base44.com/developers/references/cli/commands/introduction)) for the full command surface.

## Run Locally

From the repository root in GitHub Codespaces:

```bash
npm install
npx --yes base44@latest login   # one-time per Codespace/user
npx --yes base44@latest link    # choose the existing SmartPower app
npm run validate
npm run build
npm run codespace:start       # full-stack local Base44 backend + frontend
```

**Do not run `cd smartpower` when the repository itself is already the project root.**

Open the forwarded application port that Codespaces shows after `npm run codespace:start`.

Notes:

- **Every fresh clone needs `base44 link`.** It writes `base44/.app.jsonc` (the app-id pointer), which is deliberately gitignored. Your app id is in the Builder URL (`app.base44.com/apps/<id>/...`); `base44 link --help` shows the non-interactive flags.
- **`base44 dev` runs the frontend for you** (via `site.serveCommand` in this repo's `base44/config.jsonc`) — never run `npm run dev` yourself: alone it serves a UI with no backend behind it (`[base44] Proxy not enabled`, every `/api` call fails), and alongside `base44 dev` the second Vite silently takes the next port and you end up looking at the wrong one.
- **The app must be published at least once for the UI to load under `base44 dev`.** The frontend boots by fetching app settings from the hosted app; before the first publish that fails and every page redirects to login. The local API works regardless.
- Entities, functions, and auth run locally — entity data is **in-memory only**, wiped when `base44 dev` restarts. Everything else (Core integrations, OAuth login) is forwarded to your deployed app. Full breakdown: [Local development overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview).

## Frontend Only, Hosted Backend

To work on just the frontend against your app's live hosted backend:

```bash
base44 dev --remote
```

⚠️ In this mode writes go to your app's **production data** — plain `base44 dev` keeps everything local.

## SmartPower validation

After pulling the project, run:

```bash
npm run validate
```

This checks the Base44 entity schema conventions, verifies the core billing calculation, and confirms the protected backend functions are present. For the complete application stack, use `base44 dev` as described above.

### Required Stripe secrets

For hosted payment checkout and webhook processing, configure these Base44 secrets:

- `STRIPE_SECRET_KEY` — Stripe secret API key used to create Checkout Sessions.
- `STRIPE_WEBHOOK_SECRET` — Stripe endpoint signing secret used to verify webhook requests.
- `BASE44_APP_ID` — Base44 application id included in payment metadata when available.

The Stripe webhook handles both completed and asynchronous payment-success events and ignores duplicate Checkout Session events.

## Publish Your Changes

After pushing your changes to git, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

This repo syncs to Base44 through git, so publish from the dashboard rather than `base44 deploy` — a CLI deploy ships your local tree directly, bypassing the sync, and the deployed state silently diverges from the repo.

## Docs & Support

GitHub integration: [https://docs.base44.com/developers/app-code/local-development/github](https://docs.base44.com/developers/app-code/local-development/github)

Local development: [https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview)

Support: [https://app.base44.com/support](https://app.base44.com/support)


## Repository layout

This distribution is intentionally kept below 100 files and contains no hidden files or hidden directories.
