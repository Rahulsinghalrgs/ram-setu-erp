# Ram Setu ERP - Credentials Handover Template

Generated on: 2026-05-28

Important: Do not paste passwords, API keys, service role keys, or tokens into WhatsApp, email, chat, or public docs. Share them through a password manager such as 1Password, Bitwarden, Google Password Manager, or a private encrypted note with expiry.

## 1. GitHub / Source Code Access

Purpose: Source code repository access for Ram Setu ERP.

Required access for new team:

- GitHub organization/account owner:
- Repository URL:
- Branch used for production:
- Admin users:
- Developer users:
- Deployment branch rules:
- Existing secrets in GitHub Actions, if any:
- Who can merge to production:

Action required:

- Add new developers as collaborators.
- Remove old team members if they are no longer involved.
- Enable 2FA for all GitHub users.
- Share repository URL with the team.

## 2. Vercel Access

Purpose: Production hosting and environment variables.

Known project:

- Vercel project name: `setu-erp`
- Production URLs:
  - `https://ram-setu-erp-ruddy.vercel.app`
  - `https://setu-erp-ruddy.vercel.app`

Required access for new team:

- Vercel account/team owner:
- Project URL in Vercel dashboard:
- Production deployment permissions:
- Environment variable edit permission:
- Domain/alias permission:

Important environment variables to verify in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
TALLY_API_URL
TALLY_COMPANY_NAMES
TALLY_MANUAL_SYNC_SECRET
TALLY_BRIDGE_API_KEY
TALLY_ODBC_HOST
TALLY_ODBC_PORT
TALLY_SYNC_DAYS
WATI_API_ENDPOINT
WATI_ACCESS_TOKEN
WATI_WEBHOOK_SECRET
WATI_CHANNEL_NUMBER
WATI_LEDGER_TEMPLATE
ORDER_DELIVERY_SHEET_CSV_URL
PAYMENT_FOLLOWUP_CSV_URL
IMS_STOCK_SHEET_URL
IMS_MOVEMENT_SHEET_URL
ATTENDANCE_SHEET_CSV_URL
FIELD_VISIT_SHEET_CSV_URL
```

Action required:

- Add new team members to Vercel.
- Confirm production env vars are present.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`, WATI token, or Tally bridge key to frontend.

## 3. Supabase Access

Purpose: Database, authentication, storage, RLS policies, migrations.

Known usage:

- Supabase is used for auth, database, and storage.
- App uses Supabase URL, anon key, and service role key.

Required access for new team:

- Supabase project dashboard URL:
- Project reference ID:
- Owner/admin account:
- Database password:
- Service role key:
- Anon/public key:
- Storage bucket access:
- SQL editor access:

Important:

- `SUPABASE_SERVICE_ROLE_KEY` is highly sensitive.
- Share service role key only with backend lead/devops.
- Rotate key if old team access is removed.

Action required:

- Add new team members.
- Review RLS policies.
- Confirm all migrations are applied through:
  - `202605140001_client_ledger_wati_automation.sql`
- Regenerate local database types if schema changes.

## 4. Tally Prime Cloud / Tally Team Access

Purpose: Ledger sync, outstanding, sales/receipt register, future posting.

Known details:

```text
Tally public XML host: http://v60069.22166.tallyprimecloud.in:8080
ODBC host: v60069.22166.tallyprimecloud.in
ODBC port: 6456
Companies:
- Richa Global Sales (25-26)
- Richa Industries
```

Required access/details:

- Tally cloud provider login/contact:
- Tally server/RDP/AnyDesk access:
- Tally company open password, if needed:
- Tally XML/HTTP local port:
- ODBC driver/auth details:
- Permission to run bridge service:
- Public HTTPS bridge URL:
- Bridge API key:

Important:

- ERP should not store company password.
- Company should be opened/unlocked inside Tally server.
- Permanent bridge is still required for reliable production sync.

## 5. WATI / WhatsApp Business Access

Purpose: Payment reminders, client ledger messages, communication logs, webhook status.

Required access:

- WATI login:
- WATI API endpoint:
- WATI access token:
- Connected WhatsApp number:
- Approved template names:
- Webhook URL configured in WATI:
- Webhook secret:
- Meta Business Manager access:
- WhatsApp Business Account access:

Known issue:

- Earlier WATI response indicated `Business Account locked`.
- New team must check Meta Business Support Home and WATI account health.

Action required:

- Confirm WABA status is active.
- Confirm billing and business verification.
- Confirm templates are approved.
- Rotate WATI token if old team had access.

## 6. Google Sheets / Forms Access

Purpose: FMS feeds, payment follow-up, IMS, attendance, field tracking.

Required sheet/form access:

- Order-to-Delivery FMS Google Sheet:
- Order form:
- Payment follow-up sheet:
- IMS stock sheet:
- IMS movement sheet:
- Attendance form/sheet:
- Field visit form/sheet:

Required permissions:

- Viewer access for published CSV feed.
- Editor access for operational owners.
- Owner/admin access for new development lead.

Important:

- If published CSV URLs change, update Vercel env variables.

## 7. Domain / DNS Access

Purpose: Custom domain and future Tally bridge HTTPS URL.

Required access:

- Domain registrar:
- DNS provider:
- Domain owner:
- Current Vercel aliases:
  - `ram-setu-erp-ruddy.vercel.app`
  - `setu-erp-ruddy.vercel.app`
- Future bridge domain:
  - Example: `https://tally-bridge.richagroup.co`

Action required:

- Give new team DNS edit access only if they will configure custom domains.
- Keep DNS owner access with company owner/admin.

## 8. AnyDesk / Remote Server Access

Purpose: Tally cloud/server setup and troubleshooting.

Required access:

- AnyDesk ID:
- Temporary password/session approval process:
- Tally server Windows login, if applicable:
- Admin rights availability:
- Node.js install permission:
- Firewall/port open permission:

Important:

- Use time-limited remote access.
- Do not share permanent unattended access casually.
- Keep remote session supervised if possible.

## 9. Email / Admin Accounts

Purpose: Ownership recovery and vendor/platform notifications.

Required:

- Primary admin email:
- Recovery email:
- Phone number for OTP:
- Who owns OTP device:
- Backup admin:

Recommended:

- Use company-owned email, not individual developer email.
- Add at least two company admins.
- Enable 2FA.

## 10. Secure Transfer Checklist

Before new team starts:

- [ ] Add new team to GitHub.
- [ ] Add new team to Vercel.
- [ ] Add new team/admin to Supabase.
- [ ] Share Vercel env variables through password manager.
- [ ] Share Supabase service role key only with backend lead.
- [ ] Add WATI/Meta access.
- [ ] Share Google Sheet/Form access.
- [ ] Share Tally team contact and bridge setup status.
- [ ] Rotate old tokens if previous team should lose access.
- [ ] Remove old team access after handover.
- [ ] Confirm production deploy works.
- [ ] Confirm login works.
- [ ] Confirm Tally sync status.
- [ ] Confirm WATI test status.

## 11. What Not To Share Publicly

Never share these in chat or public docs:

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_PASSWORD
WATI_ACCESS_TOKEN
WATI_WEBHOOK_SECRET
TALLY_BRIDGE_API_KEY
TALLY_MANUAL_SYNC_SECRET
GitHub personal access tokens
Vercel tokens
Google service account keys
Tally company passwords
AnyDesk unattended password
```

## 12. Recommended Owner-Level Access Model

Company owner/admin should own:

- GitHub organization/repo ownership
- Vercel project ownership
- Supabase project ownership
- Domain/DNS ownership
- Meta Business ownership
- WATI ownership
- Google Sheets ownership
- Tally provider account ownership

Development team should get:

- GitHub developer access
- Vercel project developer access
- Supabase developer access with limited service role sharing
- Sheet editor access where needed
- Temporary remote server access only when required

