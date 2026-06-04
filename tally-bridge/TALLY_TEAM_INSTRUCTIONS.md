# Ram Setu ERP - One-Time Tally Bridge Setup

This is the permanent setup path for Ram Setu ERP. After this setup, ERP will sync from Tally through one stable HTTPS bridge URL.

## Current Requirement

- ERP: `https://setu-erp-ruddy.vercel.app`
- Tally XML/HTTP on Tally machine: `http://127.0.0.1:8080` or `http://localhost:8080`
- Tally public host currently shared: `v60069.22166.tallyprimecloud.in`
- ODBC port shared: `6456`
- Companies required:
  - `Richa Global Sales (25-26)`
  - `Richa Industries`

## What Tally Team Must Provide After Setup

Please share these two values with ERP admin:

```text
BRIDGE_HTTPS_URL=https://your-secure-bridge-domain
BRIDGE_API_KEY=<same key configured in .env>
```

Example:

```text
BRIDGE_HTTPS_URL=https://tally-bridge.richagroup.co
BRIDGE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 1 - Keep Companies Open in Tally

Open/load both companies in Tally Prime:

- `Richa Global Sales (25-26)`
- `Richa Industries`

If a company is password protected, please unlock/open it once in Tally on the server. ERP does not need the company password.

## Step 2 - Enable XML/HTTP in Tally

In Tally Prime, enable HTTP/XML access on the local machine.

Recommended local URL:

```text
http://127.0.0.1:8080
```

Verify from the Tally server browser:

```text
http://127.0.0.1:8080
```

It may show a simple Tally response or `Cannot GET /`; that is acceptable. XML POST must work.

## Step 3 - Install Node.js

Install Node.js 20 or later on the Tally cloud machine.

Check:

```bash
node -v
npm -v
```

## Step 4 - Configure Bridge

Extract the ZIP and open this folder:

```bash
cd tally-bridge
npm install
copy .env.example .env
```

Edit `.env`:

```env
PORT=65430
BRIDGE_API_KEY=replace-with-long-secret-from-erp-admin
ALLOWED_ORIGIN=https://setu-erp-ruddy.vercel.app

TALLY_ACCESS_MODE=xml
TALLY_XML_URL=http://127.0.0.1:8080
TALLY_COMPANY_NAMES=Richa Global Sales (25-26),Richa Industries

# Optional only if XML mode is not allowed:
TALLY_ODBC_HOST=v60069.22166.tallyprimecloud.in
TALLY_ODBC_PORT=6456
```

## Step 5 - Start Bridge

```bash
npm start
```

Expected output:

```text
Ram Setu Tally Bridge listening on 65430
```

## Step 6 - Expose Bridge as HTTPS

Expose bridge port `65430` as a stable HTTPS URL.

Preferred:

```text
https://tally-bridge.richagroup.co
```

Temporary tunnels are not recommended for production because URLs can rotate. Use a stable domain/reverse proxy/cloud gateway.

## Step 7 - Test

Replace URL/key and run:

```bash
curl -H "Authorization: Bearer <BRIDGE_API_KEY>" https://your-bridge-domain/health
curl -H "Authorization: Bearer <BRIDGE_API_KEY>" "https://your-bridge-domain/ledgers?company=Richa%20Global%20Sales%20(25-26)"
curl -H "Authorization: Bearer <BRIDGE_API_KEY>" "https://your-bridge-domain/ledgers?company=Richa%20Industries"
```

Expected:

- `/health` returns `ok: true`
- `/ledgers` returns JSON rows

## APIs

All APIs need:

```http
Authorization: Bearer <BRIDGE_API_KEY>
```

Available APIs:

- `GET /health`
- `GET /companies`
- `GET /ledgers?company=...`
- `GET /outstandings?company=...`
- `GET /sales-register?company=...&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /receipt-register?company=...&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /ledgers`
- `POST /sales-invoices`
- `POST /receipts`

Read sync is ready. Posting invoices/receipts to Tally must be finalized only after confirming tax ledgers, item ledgers, bank/cash ledger, voucher numbering, godown and allocation rules.
