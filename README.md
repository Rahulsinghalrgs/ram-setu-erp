# Supabase ERP

Multi-organization ERP MVP built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## What is included

- Multi-organization data model with `organization_id` on ERP records
- Supabase Row Level Security for tenant isolation
- India-first defaults: INR currency and GST-ready invoice/order fields
- Auth profile trigger for new Supabase users
- ERP module shell for customers, vendors, products, inventory, sales, purchases, invoices, reports, and settings

## Required local tools

Install these before running the app locally:

```bash
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node git supabase/tap/supabase
npm install -g pnpm
brew install --cask docker
```

Open Docker Desktop once before starting Supabase.

## Local setup

```bash
cp .env.example .env.local
pnpm install
supabase start
pnpm supabase:types
pnpm dev
```

After `supabase start`, copy the local anon key into `.env.local`.

## No-admin local runtime

This workspace also has a local, no-admin runtime under `.local/`:

```bash
export PATH="$PWD/.local/bin:$PWD/.local/npm-global/node_modules/.bin:$PWD/.local/node-v24.15.0-darwin-arm64/bin:$HOME/.bun/bin:$PATH"
npm run dev
```

Use this when Homebrew or system Node is not installed yet.

Or load the helper:

```bash
source scripts/use-local-tools.sh
```

## Useful URLs

- App: http://localhost:3000
- Supabase API: http://127.0.0.1:54321
- Supabase Studio: http://127.0.0.1:54323

## Verification

```bash
node -v
pnpm -v
docker --version
supabase --version
pnpm typecheck
pnpm build
```

## Tally integration readiness

The client screen has a Tally readiness panel for provider details, access method, exact company names, required reports, sync frequency, and recent sync logs.

Server secrets must stay outside the browser:

```bash
TALLY_API_URL=http://43.231.249.107:65430
TALLY_ODBC_HOST=v60069.22166.tallyprimecloud.in
TALLY_ODBC_PORT=6456
TALLY_COMPANY_NAMES=Richa Global Sales,Richa Industries
TALLY_BRIDGE_URL=https://your-tally-bridge-domain.example.com
TALLY_BRIDGE_API_KEY=server-side-secret
```

Dashboard ke Tally panel me bhi API URL/static IP save kiya ja sakta hai. Saved API URL ko sync ke time priority milegi; environment variable fallback ke liye hai.

ODBC details readiness ke liye record ho sakte hain, lekin Vercel serverless app direct ODBC driver session maintain nahi karega. Live cloud sync ke liye Tally team se XML API/REST bridge URL chahiye, ya ek small always-on bridge service deploy karni hogi jo ODBC read karke ERP ko HTTPS API de.

Bridge service scaffold is available in `tally-bridge/`. Run it on the Tally cloud machine after Tally team grants permission, then save its HTTPS URL in the Tally panel as `REST API`.

Tally team se confirm karna hai:

- Endpoint `http://43.231.249.107:65430` par XML `POST` request allowed ho.
- ODBC endpoint `v60069.22166.tallyprimecloud.in:6456` ka driver name, username/password/auth mode, database/company mapping, and allowed query/report list.
- Tally Prime/Tally server me target company open ya loaded ho.
- Ledger master, bills receivable, sales register, receipt register, and outstanding ageing XML export allowed ho.
- Company names exactly share karein, jaise Tally me dikhte hain.
- Server/firewall me Vercel outbound requests block na hon.
- Agar VPN/IP whitelist required hai to provider route ya public API proxy details dein.

Apply the latest Supabase migrations before using the panel so `tally_integration_settings` and `tally_sync_logs` are available.

## Order to Delivery FMS

The Sales screen at `/dashboard/sales?system=order-to-delivery` now supports:

- Direct import from the linked published Google Sheet FMS.
- Manual order punch and CSV bulk import.
- Payment overdue, stock, dispatch, billing, delivery, and feedback stage tracking.
- Proof links for order, dispatch, invoice, and PO.
- Tally invoice sync linkage back to the ERP order board.

Use this environment variable if the published sheet URL changes:

```bash
ORDER_DELIVERY_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
```
