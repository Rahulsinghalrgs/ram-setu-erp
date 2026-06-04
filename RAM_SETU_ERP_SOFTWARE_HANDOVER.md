# Ram Setu ERP - Software Handover Document

Generated on: 2026-05-28  
Project: Ram Setu ERP for Richa Global Sales / Richa Group  
Production URL: https://ram-setu-erp-ruddy.vercel.app  
Alternate production alias: https://setu-erp-ruddy.vercel.app  
Active codebase path: `/Users/rahulsinghal/Documents/Codex/2026-05-01/https-setu-erp-ruddy-vercel-app`

## 1. Executive Summary

Ram Setu ERP is a custom operations ERP built for Richa Global Sales. It started as a Supabase-backed ERP MVP and has grown into a company-specific control room for sales, purchase, inventory, order-to-delivery tracking, field operations, attendance, payment follow-up, WhatsApp/WATI communication, and Tally data sync.

The system is built as a Next.js application using Supabase as the database/auth/storage backend. Vercel is used for production hosting. Most modules are server-rendered dashboards with server actions for secure writes. The ERP is multi-organization capable in the database design, although the current production usage is for Richa Global Sales.

The application currently supports:

- ERP dashboard and command center for operational KPIs.
- Client database with Tally mapping, outstanding amount, GST/contact fields, CSV import, PDF report, and WATI ledger sender.
- Tally XML sync for two companies: `Richa Global Sales (25-26)` and `Richa Industries`.
- Order-to-Delivery FMS dashboard with Google Sheet feed, manual order punch, CSV import, dispatch/payment/stock/billing/delivery stages, proof links, and Tally invoice linkage fields.
- Purchase FMS dashboard with purchase punch and purchase register.
- IMS/inventory dashboard with Google Sheet stock/movement feed and ERP inventory movements.
- Payment follow-up dashboard with outstanding queue and WATI reminder path.
- Communication center with WATI test sender, reminder engine, bulk reminder upload, status logs, and webhook receiver.
- Attendance and leave dashboard with ERP punch system, selfie/location proof storage, daily review, exception queue, and CSV export.
- Field visit tracking dashboard with GPS/image proof and visit register.
- Employee directory and credential management.
- Department checklist center.
- Access control using organization membership and per-module permissions.

## 2. Technology Stack

### Frontend and Backend

- Framework: Next.js App Router
- Language: TypeScript
- UI: React, Tailwind CSS, lucide-react icons
- Hosting: Vercel
- Server behavior: Next.js server components, route handlers, and server actions

### Database and Auth

- Backend: Supabase
- Database: PostgreSQL
- Auth: Supabase Auth
- Storage buckets:
  - Attendance selfie/location proofs
  - Field visit proofs
- Security model:
  - Row Level Security enabled on core tables.
  - `organization_id` is used across ERP records.
  - Policies restrict reads/writes to organization members and module-permitted users.

### External Integrations

- Tally Prime Cloud:
  - XML/HTTP endpoint confirmed at `http://v60069.22166.tallyprimecloud.in:8080`.
  - ODBC port shared by Tally team: `6456`.
  - Bridge package available in `tally-bridge/`.
- WATI / WhatsApp:
  - Used for payment reminders, ledger messages, test sender, status logs, and webhook events.
  - Business account lock was observed earlier; Meta/WATI account status must be monitored.
- Google Sheets:
  - Order-to-delivery FMS data.
  - Payment follow-up outstanding data.
  - IMS stock/movement data.
  - Attendance and field tracking legacy/import feeds.

## 3. Repository Structure

Important folders:

```text
app/
  api/
  auth/
  dashboard/
components/
lib/
supabase/
  migrations/
  seed.sql
tally-bridge/
tally-bridge 2/
public/
```

Important root files:

```text
package.json
README.md
middleware.ts
next.config.ts
tailwind.config.ts
RAM_SETU_ERP_SOFTWARE_HANDOVER.md
ram-setu-tally-bridge-one-time-setup.zip
```

Main module entry points:

```text
app/dashboard/page.tsx
app/dashboard/customers/page.tsx
app/dashboard/sales/page.tsx
app/dashboard/purchases/page.tsx
app/dashboard/inventory/page.tsx
app/dashboard/invoices/page.tsx
app/dashboard/field-operations/page.tsx
app/dashboard/checklists/page.tsx
app/dashboard/settings/page.tsx
```

Core libraries:

```text
lib/erp-queries.ts
lib/erp-actions.ts
lib/access-control.ts
lib/tally-integration.ts
lib/tally-bridge-integration.ts
lib/tally-actions.ts
lib/tally-config.ts
lib/communication.ts
lib/communication-actions.ts
lib/client-ledger-actions.ts
lib/payment-followup.ts
lib/payment-followup-actions.ts
lib/order-to-delivery.ts
lib/attendance.ts
lib/field-tracking.ts
lib/ims.ts
lib/pdf.ts
```

## 4. Environment Variables

Do not commit real secrets. The following names are used by the app and should be configured in Vercel production and local `.env.local` as needed.

### Supabase

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### App URLs and Setup

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
SETUP_SECRET
RAM_SETU_ERP_API_KEY
```

### Tally

```text
TALLY_API_URL
TALLY_COMPANY_NAMES
TALLY_MANUAL_SYNC_SECRET
TALLY_BRIDGE_API_KEY
TALLY_ODBC_HOST
TALLY_ODBC_PORT
TALLY_SYNC_DAYS
TALLY_SYNC_FROM_DATE
TALLY_SYNC_TO_DATE
```

Current known Tally values:

```text
TALLY_API_URL=http://v60069.22166.tallyprimecloud.in:8080
TALLY_COMPANY_NAMES=Richa Global Sales (25-26),Richa Industries
TALLY_ODBC_HOST=v60069.22166.tallyprimecloud.in
TALLY_ODBC_PORT=6456
TALLY_SYNC_DAYS=60
```

Important note: Direct Vercel-to-Tally access has failed in production with "reachable nahi hai". Temporary tunnel sync worked. Permanent operation requires bridge setup.

### WATI / WhatsApp

```text
WATI_API_ENDPOINT
WATI_ACCESS_TOKEN
WATI_WEBHOOK_SECRET
WATI_CHANNEL_NUMBER
WATI_LEDGER_TEMPLATE
```

Default ledger template used by code:

```text
client_ledger_statement
```

### Google Sheet Feeds

```text
ORDER_DELIVERY_FORM_URL
ORDER_DELIVERY_SHEET_URL
ORDER_DELIVERY_SHEET_CSV_URL
PAYMENT_FOLLOWUP_CSV_URL
IMS_FORM_URL
IMS_STOCK_SHEET_URL
IMS_MOVEMENT_SHEET_URL
FIELD_VISIT_FORM_URL
FIELD_VISIT_SHEET_URL
FIELD_VISIT_SHEET_CSV_URL
ATTENDANCE_FORM_URL
ATTENDANCE_SHEET_URL
ATTENDANCE_SHEET_CSV_URL
```

## 5. Database and Migrations

Migrations are located in `supabase/migrations/`.

### Base ERP Schema

File:

```text
202604290001_initial_erp_schema.sql
```

Creates:

- `profiles`
- `organizations`
- `organization_members`
- `customers`
- `vendors`
- `product_categories`
- `products`
- `warehouses`
- `inventory_movements`
- `sales_orders`
- `sales_order_items`
- `purchase_orders`
- `purchase_order_items`
- `invoices`
- `invoice_items`
- `payments`

Also creates:

- `is_org_member`
- `is_org_admin`
- `touch_updated_at`
- `create_organization_with_owner`
- `handle_new_user`
- RLS policies for organization member access

### Module Permission System

File:

```text
202604300001_member_module_permissions.sql
```

Creates:

- `organization_member_permissions`
- `has_module_permission`

Purpose:

- Controls per-user module visibility and edit permissions.
- Used by routes/actions to guard dashboards and writes.

### Field Operations

Files:

```text
202604300002_field_operations.sql
202604300003_field_staff_master.sql
202605050001_field_visit_location_proof.sql
```

Creates/updates:

- `field_vehicles`
- `field_trips`
- `field_exceptions`
- `field_staff`
- `field_visit_punches`
- Storage bucket for field visit proof images

### Payment and Communication

Files:

```text
202605020001_payment_followups.sql
202605020002_communication_center.sql
202605050004_wati_observability.sql
202605140001_client_ledger_wati_automation.sql
```

Creates/updates:

- `payment_followups`
- `communication_logs`
- `workflow_reminders`
- `wati_webhook_events`
- `client_ledger_share_links`

Purpose:

- Tracks payment follow-up actions.
- Logs WATI messages and provider responses.
- Stores reusable secure ledger share links.
- Receives WATI webhook events.

### Client Master and Tally Fields

Files:

```text
202605030001_client_master_details.sql
202605030002_client_tally_communication.sql
202605050002_tally_integration_readiness.sql
```

Adds:

- Client master business fields.
- Tally GUID/master/alter IDs.
- WhatsApp fields and opt-in status.
- Tally readiness/settings/log tables:
  - `tally_integration_settings`
  - `tally_sync_logs`

### Order-to-Delivery FMS

Files:

```text
202605030003_order_to_delivery_flow.sql
202605050003_order_delivery_fms_tally_fields.sql
```

Adds sales order fields for:

- Payment check status
- Stock status
- Dispatch status
- Billing status
- Delivery status
- Feedback status
- Proof links
- Delivery date
- Tally invoice number/GUID/sync timestamp

### Department Checklists and HR

Files:

```text
202605030004_department_checklists.sql
202605030005_workflow_reminders.sql
202605040001_employee_directory_credentials.sql
202605040002_attendance_location_selfie.sql
```

Creates:

- `department_checklists`
- `workflow_reminders`
- `employee_directory`
- `attendance_punches`
- Attendance proof storage bucket

## 6. Access Control

Access is handled in:

```text
lib/access-control.ts
lib/erp-queries.ts
lib/erp-actions.ts
```

Key functions:

- `getAppContext()`
- `getRawAppContext()`
- `requireModuleAccess()`
- `canAccessModule()`
- `has_module_permission` Supabase RPC

Core idea:

- A user belongs to an organization through `organization_members`.
- Module permissions are stored in `organization_member_permissions`.
- Admins bypass most module restrictions.
- Server actions call `ensureWorkspace()` or module guards before writes.

## 7. UI Layout and Navigation

Main shell:

```text
app/dashboard/layout.tsx
components/sidebar.tsx
components/sidebar-client.tsx
components/topbar.tsx
```

Design direction:

- Operational control room style.
- Dark left sidebar.
- Light main workspace.
- Cards and tables for KPIs/registers.
- Richa/Ram Setu branding.
- India-first formatting: INR, GST fields, state codes.

Primary URL sections:

```text
/dashboard
/dashboard/customers
/dashboard/sales
/dashboard/purchases
/dashboard/inventory
/dashboard/invoices
/dashboard/field-operations
/dashboard/checklists
/dashboard/settings
/dashboard/reports
```

Special system query modes:

```text
/dashboard/sales?system=order-to-delivery
/dashboard/inventory?system=ims-control
/dashboard/invoices?system=payment-follow-up
/dashboard/field-operations?system=field-tracking
/dashboard/settings?system=attendance-leave
/dashboard/settings?system=communication-center
/dashboard/settings?system=employee-lifecycle
/dashboard/customers?system=client-database#tally-sync
```

## 8. Module Details

### 8.1 Dashboard / Command Center

Files:

```text
app/dashboard/page.tsx
lib/erp-queries.ts
```

Purpose:

- Landing command center for Richa Global Sales.
- Shows KPI cards for:
  - Order book
  - Receivables
  - Inventory units
  - Buyer accounts
- Shows priority order board.
- Shows order pipeline.
- Gives management snapshot for dispatch, QC, control, and velocity.

Current behavior:

- Reads dashboard data using `getDashboardData()`.
- Aggregates sales orders, invoices, inventory movements, products, customers, and vendors.

### 8.2 Client Database

Files:

```text
app/dashboard/customers/page.tsx
components/erp-forms.tsx
components/tally-sync-panel.tsx
components/client-ledger-automation.tsx
lib/erp-actions.ts
lib/client-ledger-actions.ts
app/api/client-ledger/[token]/route.ts
app/api/client-ledger/[token]/pdf/route.ts
app/api/reports/tally-clients/pdf/route.ts
```

Purpose:

- Central customer/client/buyer master.
- Stores business details, contact details, GST/PAN, priority, credit rules, Tally mapping, WhatsApp consent, and opening outstanding.

Features built:

- Manual buyer/client add form.
- Bulk CSV client import.
- Smart upsert logic using Tally GUID, client code, GSTIN, or company name.
- Tally mapped count.
- WhatsApp-ready count.
- Opening outstanding summary.
- Missing contact and credit risk metrics.
- Client master register table.
- Tally PDF report route.
- CSV export data URL.
- WATI client ledger sender.

Client ledger sender:

- Shows outstanding clients from Tally-synced `opening_outstanding`.
- Supports single-client `Send Ledger`.
- Supports bulk sending with limit.
- Creates secure ledger link token in `client_ledger_share_links`.
- Public ledger page: `/api/client-ledger/[token]`.
- Public ledger PDF: `/api/client-ledger/[token]/pdf`.
- Logs actions in `communication_logs`.

Known dependency:

- WATI account must be active and template must be approved.

### 8.3 Tally Integration

Files:

```text
components/tally-sync-panel.tsx
lib/tally-actions.ts
lib/tally-config.ts
lib/tally-integration.ts
lib/tally-bridge-integration.ts
app/api/tally/manual-sync/route.ts
tally-bridge/
```

Purpose:

- Pull Tally data into ERP.
- Maintain provider readiness details.
- Sync ledger master and optionally voucher/register data.

Current confirmed Tally companies:

```text
RICHA GLOBAL SALES (25-26)
RICHA  INDUSTRIES
```

Configured ERP company names:

```text
Richa Global Sales (25-26)
Richa Industries
```

Successful sync already completed:

```text
Ledgers read: 808
Clients upserted: 261
Warnings: 0
Scope: ledgers
```

Current production issue:

- Vercel cannot reliably reach direct Tally XML URL `http://v60069.22166.tallyprimecloud.in:8080`.
- Temporary tunnel sync worked.
- Permanent bridge setup is still required.

Direct XML sync mode:

- Uses `lib/tally-integration.ts`.
- Posts XML to Tally API.
- Probes companies first.
- Matches configured company names against Tally company list with normalized comparison.
- Fetches ledger collection.
- Filters buyer ledgers by parent group containing debtor/sundry debtor.
- Upserts customers with Tally GUID/master/alter IDs.
- Full sync can also fetch vouchers and upsert invoices/payments, but full voucher sync has timeout risk.

Bridge sync mode:

- Uses `lib/tally-bridge-integration.ts`.
- Calls HTTPS bridge endpoints.
- Supports:
  - `/health`
  - `/companies`
  - `/ledgers`
  - `/outstandings`
  - `/sales-register`
  - `/receipt-register`
- Uses `TALLY_SYNC_DAYS` for limited register window.

Tally bridge package:

```text
tally-bridge/
tally-bridge/TALLY_TEAM_INSTRUCTIONS.md
ram-setu-tally-bridge-one-time-setup.zip
```

Correct bridge design:

- Tally XML remains on local `127.0.0.1:8080`.
- Bridge must run on separate port `65430`.
- Bridge must expose stable HTTPS URL.
- ERP should be configured with REST API/bridge URL once live.

Important lessons from previous setup:

- Earlier bridge was only partially configured.
- `BRIDGE_API_KEY` was not configured in the first observed `/health` response.
- Port `8080` cannot safely be used by bridge if Tally XML is already on `8080`.
- Public `65430` was not live when tested.

### 8.4 Order-to-Delivery FMS

Files:

```text
app/dashboard/sales/page.tsx
components/order-to-delivery-dashboard.tsx
components/order-punch-client.tsx
components/erp-forms.tsx
lib/order-to-delivery.ts
lib/erp-actions.ts
```

URL:

```text
/dashboard/sales?system=order-to-delivery
```

Purpose:

- Control sales order journey from order punch to final delivery and feedback.
- Replace/extend the Google Sheet order-to-delivery FMS inside ERP.

Features built:

- Linked Google Sheet feed parser.
- Order Control Board.
- Manual order punch.
- Bulk sales order CSV import.
- Order FMS reference from linked sheet.
- Order-to-delivery process map.
- Stage statuses:
  - Payment check
  - Stock check
  - Dispatch
  - Billing
  - Delivery
  - Feedback
- Risk logic:
  - Blocked if payment/stock/stage blocked.
  - Overdue if delivery date passed and not delivered.
  - Attention if any stage pending/in progress.
  - Clear when all stages done.
- Proof links:
  - Order proof
  - Dispatch proof
  - Invoice proof
  - PO proof
  - Dispatch location
- Tally invoice linkage:
  - `tally_invoice_number`
  - `tally_invoice_guid`
  - `tally_synced_at`

Known future work:

- Improve drag/drop stage update UX.
- Add automatic stage reminders.
- Add more robust Tally invoice item sync once posting rules are finalized.

### 8.5 Sales Module

Files:

```text
app/dashboard/sales/page.tsx
components/erp-forms.tsx
lib/erp-actions.ts
```

Purpose:

- Standard sales order register.
- Manual sales order creation.
- Links to order-to-delivery mode.

Features:

- Sales order form.
- Sales order register table.
- Buyer/status/date/total columns.
- Module permission guard for edit access.

### 8.6 Purchase FMS

Files:

```text
app/dashboard/purchases/page.tsx
components/purchase-fms-dashboard.tsx
components/purchase-punch-client.tsx
components/erp-forms.tsx
lib/erp-actions.ts
```

Purpose:

- Purchase command center for supplier orders and purchase register.

Features:

- Purchase Punch.
- Purchase CSV bulk import.
- Live Purchase Register.
- Supplier Master view.
- Metrics:
  - PO value
  - Purchase order count
  - Open orders
  - Supplier count
  - Item rows
- Next purchase number generation.

### 8.7 Inventory and IMS

Files:

```text
app/dashboard/inventory/page.tsx
components/ims-dashboard.tsx
lib/ims.ts
lib/erp-queries.ts
lib/erp-actions.ts
```

URLs:

```text
/dashboard/inventory
/dashboard/inventory?system=ims-control
```

Standard inventory:

- Consolidated stock register.
- Godown summary.
- Inventory movement register.
- Product balances calculated from `inventory_movements`.

IMS control:

- Reads Google Sheet stock master and movement sheet.
- Shows total stock, today IN, today OUT, in transit.
- Live Stock Master.
- Location stock cards.
- System health.
- Stock IN/OUT register.

Known future work:

- Reconcile Google Sheet IMS feed with ERP `inventory_movements`.
- Decide final source of truth: ERP DB vs Google Sheet.

### 8.8 Products

Files:

```text
app/dashboard/products/page.tsx
components/erp-forms.tsx
lib/product-master.ts
lib/erp-actions.ts
```

Purpose:

- Product/SKU catalogue.

Features:

- Product add form.
- Bulk product CSV import.
- Product catalogue table.
- GST rate, purchase price, sales price, unit, SKU.

### 8.9 Vendors

Files:

```text
app/dashboard/vendors/page.tsx
components/erp-forms.tsx
lib/erp-actions.ts
```

Purpose:

- Supplier master.

Features:

- Supplier add form.
- Supplier table.
- Supplier name, contact, GST/PAN, terms, status.

### 8.10 Invoices and Payment Follow-Up

Files:

```text
app/dashboard/invoices/page.tsx
components/payment-followup-dashboard.tsx
lib/payment-followup.ts
lib/payment-followup-actions.ts
```

URLs:

```text
/dashboard/invoices
/dashboard/invoices?system=payment-follow-up
```

Invoice module:

- GST invoice table.
- Invoice totals and balance due.

Payment follow-up dashboard:

- Reads payment outstanding CSV feed.
- Priority Payment Queue.
- Follow-up history stored in Supabase.
- WATI reminder send flow.
- Promise date/status logging.
- Summary:
  - Total outstanding
  - Open bills
  - >90 days risk
  - Promised amount
- Basic WhatsApp link fallback.

Known future work:

- Reconcile Tally outstanding with payment follow-up Google Sheet source.
- Add automatic daily follow-up schedule after WATI account is stable.

### 8.11 Communication Center

Files:

```text
app/dashboard/settings/page.tsx
components/communication-center.tsx
lib/communication.ts
lib/communication-actions.ts
app/api/communication/send-payment-test/route.ts
app/api/communication/wati-message-status/route.ts
app/api/webhooks/wati/route.ts
```

URL:

```text
/dashboard/settings?system=communication-center
```

Purpose:

- Central WATI/WhatsApp operations center.
- Reminder engine and communication audit log.

Features:

- WATI configuration diagnostics.
- Meta/WATI business account locked warning panel.
- Universal Reminder Engine.
- Bulk reminder upload from CSV.
- WATI Template Pack.
- Reminder Queue.
- WATI Test Sender.
- Communication Log.
- WATI webhook receiver.
- WATI message status API.

Known WATI issue:

- WATI returned Business Account Locked / Meta restriction earlier.
- WATI support indicated this likely requires Meta Business Manager / Business Support Home review.
- Delivery may fail even when API creates message IDs.

### 8.12 Attendance and Leave

Files:

```text
app/dashboard/settings/page.tsx
components/attendance-panel.tsx
components/attendance-punch-form.tsx
lib/attendance.ts
```

URL:

```text
/dashboard/settings?system=attendance-leave
```

Purpose:

- HR attendance command center with proof and exceptions.

Features:

- ERP punch form.
- Location/selfie proof capture.
- Attendance register.
- Daily HR review.
- Exception queue.
- Leave queue.
- System health.
- GPS proof control.
- Admin visibility.
- CSV export.

Storage:

- Attendance selfie proof bucket created by migration.

Important logic:

- Uses India time zone.
- Late cutoff currently around 10:15.
- Groups by employee and identifies missing punch/out, leave, manual note, proof/location gaps.

### 8.13 Field Visit Tracking

Files:

```text
app/dashboard/field-operations/page.tsx
components/field-tracking-dashboard.tsx
components/field-visit-punch-form.tsx
lib/field-tracking.ts
lib/field-operations-actions.ts
lib/field-operations-queries.ts
```

URL:

```text
/dashboard/field-operations?system=field-tracking
```

Purpose:

- Track field staff visits with GPS/image proof.

Features:

- Secure field visit punch system.
- Visit register.
- Visit queue.
- GPS/map links.
- Reading/fuel bill proof images.
- Vehicle reading and distance fields.
- System health.
- Operations visibility.

Storage:

- Field visit proof bucket created by migration.

### 8.14 Field Operations

Files:

```text
app/dashboard/field-operations/page.tsx
components/field-operations-panel.tsx
lib/field-operations-actions.ts
lib/field-operations-queries.ts
```

Purpose:

- Vehicle/staff/trip control for field operations.

Database:

- `field_vehicles`
- `field_trips`
- `field_exceptions`
- `field_staff`

### 8.15 Employee Directory and Credentials

Files:

```text
app/dashboard/settings/page.tsx
components/employee-directory.tsx
components/erp-forms.tsx
lib/erp-actions.ts
lib/erp-queries.ts
```

URL:

```text
/dashboard/settings?system=employee-lifecycle
```

Purpose:

- Central employee master and ERP login control.

Features:

- Employee record form.
- Employee CSV bulk import.
- Employee filters:
  - Department
  - Status
  - Access status
  - Search query
- Employee report CSV export.
- Department strength.
- Credential queue.
- Central Employee Register.
- Create ERP Login.
- Phone/email masking in UI.

Database:

- `employee_directory`

### 8.16 Department Checklist Center

Files:

```text
app/dashboard/checklists/page.tsx
components/checklist-center.tsx
components/erp-forms.tsx
```

URL:

```text
/dashboard/checklists
```

Purpose:

- Department-wise recurring and one-time task/checklist control.

Features:

- Department cards.
- Checklist register.
- Add/update checklist entries.
- Status and priority display.
- Due today and blocked counts.
- CSV report export.

Supported department group examples:

- Dashboard
- Sales
- Purchase
- Inventory
- Accounts
- HR/Admin

### 8.17 Reports

Files:

```text
app/dashboard/reports/page.tsx
app/api/reports/tally-clients/pdf/route.ts
lib/pdf.ts
```

Purpose:

- Management report dashboard.
- Tally client PDF export.

Current reports:

- Order book
- Receivable
- Inventory
- Buyer/client report

Known future work:

- Add PDF/CSV downloads for all major dashboard modules.
- Add scheduled report emails/WhatsApp after communication layer is stable.

## 9. API Routes

Current API routes:

```text
app/api/client-ledger/[token]/route.ts
app/api/client-ledger/[token]/pdf/route.ts
app/api/communication/send-payment-test/route.ts
app/api/communication/wati-message-status/route.ts
app/api/enquiries/route.ts
app/api/leads/route.ts
app/api/orders/route.ts
app/api/reports/tally-clients/pdf/route.ts
app/api/tally/manual-sync/route.ts
app/api/webhooks/wati/route.ts
```

Important notes:

- `/api/tally/manual-sync` is protected by `TALLY_MANUAL_SYNC_SECRET`.
- `/api/client-ledger/[token]` and `/pdf` are token-based public/share routes.
- WATI webhook route should validate `WATI_WEBHOOK_SECRET`.
- Public enquiry/leads/orders APIs are intended for external capture flows.

## 10. Data Import and Export

### CSV Import

Implemented imports:

- Client bulk import.
- Product bulk import.
- Sales order bulk import.
- Purchase order bulk import.
- Employee bulk import.
- Workflow reminder bulk import.

### Google Sheet Feeds

Modules using sheet feeds:

- Order-to-delivery FMS.
- Payment follow-up.
- IMS stock/movement.
- Attendance legacy data.
- Field tracking legacy data.

### PDF / CSV Export

Implemented:

- Tally client report PDF.
- Public client ledger PDF.
- Employee CSV export.
- Checklist CSV export.
- Attendance CSV export.
- Workflow reminder CSV/template.
- Client report CSV data URL.

## 11. Tally Integration Deep Dive

### Goal

ERP needs to fetch and eventually post data with Tally for:

- Ledger master
- Bills receivable / outstanding ageing
- Sales register
- Receipt register
- Invoice linkage
- Future invoice/receipt posting

### Current Working Status

Manual ledger sync was successfully completed once using a temporary tunnel because direct Vercel-to-Tally access failed.

Successful sync result:

```json
{
  "companies": ["RICHA GLOBAL SALES (25-26)", "RICHA  INDUSTRIES"],
  "scope": "ledgers",
  "result": {
    "ledgersRead": 808,
    "clientsUpserted": 261,
    "vouchersRead": 0,
    "invoicesUpserted": 0,
    "paymentsCreated": 0,
    "warnings": []
  }
}
```

### Why Permanent Bridge Is Required

The public Tally XML endpoint responds from local developer machine checks, but Vercel production cannot reliably reach it. This means production sync cannot depend on direct Tally XML public URL.

Permanent setup should be:

```text
Tally Prime XML locally on server: http://127.0.0.1:8080
Bridge service on server:         http://127.0.0.1:65430
Public HTTPS bridge URL:          https://tally-bridge.richagroup.co
ERP REST API mode:                bridge URL + BRIDGE_API_KEY
```

### Tally Bridge Package

Location:

```text
tally-bridge/
ram-setu-tally-bridge-one-time-setup.zip
```

Recommended `.env` on Tally server:

```text
PORT=65430
BRIDGE_API_KEY=<long-secret-shared-with-ERP-admin>
ALLOWED_ORIGIN=https://setu-erp-ruddy.vercel.app

TALLY_ACCESS_MODE=xml
TALLY_XML_URL=http://127.0.0.1:8080
TALLY_COMPANY_NAMES=Richa Global Sales (25-26),Richa Industries

TALLY_ODBC_HOST=v60069.22166.tallyprimecloud.in
TALLY_ODBC_PORT=6456
```

Bridge setup steps are documented in:

```text
tally-bridge/TALLY_TEAM_INSTRUCTIONS.md
```

### Future Tally Posting Requirements

Posting invoices/receipts to Tally is intentionally not finalized yet. Before enabling posting, the team must confirm:

- Tax ledger names.
- Item ledger names.
- Bank/cash ledger names.
- Voucher numbering rules.
- Godown rules.
- GST allocation rules.
- Round-off ledger.
- Whether Tally should create or only update vouchers.
- How to handle duplicate invoice numbers across two companies.

## 12. WATI / WhatsApp Deep Dive

### Current Purpose

WATI is used for:

- Payment follow-up reminders.
- Client ledger statement links.
- Test template sending.
- Communication status tracking.
- Webhook event capture.

### Important Files

```text
lib/communication.ts
lib/communication-actions.ts
lib/client-ledger-actions.ts
components/communication-center.tsx
components/client-ledger-automation.tsx
app/api/webhooks/wati/route.ts
app/api/communication/wati-message-status/route.ts
```

### Known Business Account Lock Issue

WATI response indicated that API requests may be accepted and message IDs created, but final delivery fails with Business Account Locked. This likely means Meta has restricted/disabled the WhatsApp Business Account.

Recommended action:

- Open Meta Business Manager.
- Go to Business Support Home.
- Check WABA status.
- Submit review if restricted.
- Check billing, business verification, policy review, and partner/account issue.

ERP side can log failures, but delivery will not resume until Meta/WATI unlocks the account.

## 13. Deployment

### Production

Primary production:

```text
https://ram-setu-erp-ruddy.vercel.app
```

Alternate alias:

```text
https://setu-erp-ruddy.vercel.app
```

Project is linked to Vercel:

```text
.vercel/project.json
```

Useful commands:

```bash
./node_modules/.bin/vercel env ls production
./node_modules/.bin/vercel env pull .env.production.local --environment=production
./node_modules/.bin/vercel deploy --prod --yes
```

Build command:

```bash
npm run build
```

Local dev:

```bash
npm install
npm run dev
```

Type check:

```bash
npm run typecheck
```

Supabase local:

```bash
supabase start
supabase db reset
supabase gen types typescript --local > lib/database.types.ts
```

## 14. Current Known Issues and Gaps

### High Priority

1. Permanent Tally bridge is not live.
   - Direct Tally XML from Vercel fails.
   - Bridge should be installed on Tally server with `PORT=65430`.
   - Need stable HTTPS bridge URL and API key.

2. WATI business account lock.
   - Message creation may succeed but delivery fails.
   - Must be resolved in Meta/WATI account.

3. Full Tally voucher sync can timeout.
   - Ledger sync works.
   - Full voucher/register sync needs bridge-based, date-windowed sync.

4. Supabase migrations must be kept applied.
   - Some UI panels depend on later migrations.
   - New team should verify production DB has all migrations through `202605140001_client_ledger_wati_automation.sql`.

### Medium Priority

1. Google Sheet feeds are still used by several modules.
   - Decide final source of truth.
   - Gradually migrate to ERP database tables where appropriate.

2. Auto scheduler not fully active.
   - Tally panel has sync mode wording, but true automatic scheduled sync requires Vercel cron or external scheduler.

3. Tally posting not finalized.
   - Needs accounting rule confirmation before enabling.

4. Role/permission UI can be expanded.
   - Doer access exists, but team-level onboarding flow can be improved.

5. Error visibility can be improved.
   - Add admin-only integration health page for Tally/WATI/Sheets.

### Low Priority / UX

1. Add more export buttons.
2. Add stage update modals for order-to-delivery.
3. Improve mobile layouts for dense dashboards.
4. Add audit trail for critical changes.
5. Add richer PDF templates with Richa branding.

## 15. Recommended Next Development Plan

### Phase 1 - Stabilize Integrations

- Complete Tally bridge install on Tally cloud machine.
- Get stable HTTPS URL.
- Switch ERP Tally panel to REST/bridge mode.
- Test `/health`, `/companies`, `/ledgers`, `/outstandings`.
- Run ledger sync from production without temporary tunnel.
- Resolve WATI Business Account Locked status.
- Confirm approved template names.

### Phase 2 - Database and Migration Audit

- Verify all migrations are applied in production.
- Regenerate `lib/database.types.ts` from live schema or local Supabase.
- Add migration status checklist to README.
- Check RLS policies for all newer tables.

### Phase 3 - Operational Workflows

- Add Tally sync logs display improvements.
- Add scheduled sync using Vercel Cron:
  - hourly ledger/outstanding sync
  - daily sales/receipt register sync
- Add order stage update forms.
- Add payment follow-up daily queue automation.

### Phase 4 - Tally Posting

- Collect posting requirements from accounts team.
- Add staging/test mode for voucher posting.
- Create controlled API for:
  - sales invoice post
  - receipt post
  - status reconciliation
- Add duplicate prevention and audit logs.

### Phase 5 - Reporting

- Management PDF pack.
- Client ledger PDF branding.
- Dispatch report.
- Outstanding ageing report.
- Attendance monthly report.
- Field visit mileage/fuel report.

## 16. Developer Onboarding Checklist

1. Clone/open the repo.
2. Install Node dependencies.
3. Configure `.env.local`.
4. Confirm Supabase keys.
5. Run local dev server.
6. Run typecheck.
7. Review migrations.
8. Review production Vercel env variables.
9. Verify login/auth flow.
10. Open dashboard pages:
    - `/dashboard`
    - `/dashboard/customers`
    - `/dashboard/sales?system=order-to-delivery`
    - `/dashboard/invoices?system=payment-follow-up`
    - `/dashboard/settings?system=communication-center`
11. Verify module permissions.
12. Verify Tally panel status.
13. Verify WATI diagnostics.
14. Confirm Google Sheet URLs.

## 17. Security Notes

- Never expose Supabase service role key in browser/client code.
- Tally credentials/API keys must remain server-side.
- WATI access token must remain server-side.
- Public ledger links are tokenized and should have expiry/usage rules reviewed.
- Attendance and field visit proof images should use signed URLs, not public permanent URLs.
- Remote server access via AnyDesk should be controlled and time-limited.
- Do not store company passwords inside ERP.
- If Tally company is password protected, open/unlock it inside Tally server session; ERP should not know the password.

## 18. Important Files for New Team

Start here:

```text
README.md
RAM_SETU_ERP_SOFTWARE_HANDOVER.md
package.json
app/dashboard/layout.tsx
app/dashboard/page.tsx
lib/erp-queries.ts
lib/erp-actions.ts
supabase/migrations/
```

For Tally:

```text
components/tally-sync-panel.tsx
lib/tally-actions.ts
lib/tally-integration.ts
lib/tally-bridge-integration.ts
app/api/tally/manual-sync/route.ts
tally-bridge/TALLY_TEAM_INSTRUCTIONS.md
```

For WATI:

```text
components/communication-center.tsx
components/client-ledger-automation.tsx
lib/communication.ts
lib/communication-actions.ts
lib/client-ledger-actions.ts
app/api/webhooks/wati/route.ts
```

For Order-to-Delivery:

```text
components/order-to-delivery-dashboard.tsx
lib/order-to-delivery.ts
supabase/migrations/202605030003_order_to_delivery_flow.sql
supabase/migrations/202605050003_order_delivery_fms_tally_fields.sql
```

For HR/Field:

```text
components/attendance-panel.tsx
components/field-tracking-dashboard.tsx
components/employee-directory.tsx
lib/attendance.ts
lib/field-tracking.ts
```

## 19. Business Context and Current Decisions

Current business assumptions:

- Richa Global Sales is the main operating company in ERP UI.
- Tally sync must support two companies:
  - Richa Global Sales (25-26)
  - Richa Industries
- Tally data is currently read-only for ERP sync.
- Tally posting will be added only after accounting rules are confirmed.
- ERP should hide credentials/secrets from browser.
- Users should only see data allowed by Supabase RLS/module permissions.
- WATI is intended for client communication but depends on account health.
- Google Sheets remain a temporary/bridge source for some FMS workflows.

## 20. Short Status Snapshot

Completed:

- Core ERP schema and dashboards.
- Access control.
- Client master with Tally/WATI fields.
- Order-to-delivery FMS.
- Purchase FMS.
- Inventory and IMS view.
- Payment follow-up dashboard.
- WATI communication center and logs.
- Attendance and field proof systems.
- Employee directory.
- Department checklists.
- Tally ledger sync code for two companies.
- Tally bridge package and setup ZIP.
- One successful Tally ledger sync into ERP.

Pending:

- Permanent Tally bridge live HTTPS URL.
- WATI account unlock.
- Production scheduled sync.
- Full voucher/register sync stabilization.
- Tally posting rules and implementation.
- Production migration audit.
- Final source-of-truth decision for Google Sheets vs ERP DB.

