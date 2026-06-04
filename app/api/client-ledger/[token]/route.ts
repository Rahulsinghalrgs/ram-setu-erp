import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function formatAmount(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function htmlText(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 20) {
    return new NextResponse("Invalid ledger link.", { status: 400 });
  }

  const admin = createAdminClient() as any;
  const { data: link, error } = await admin
    .from("client_ledger_share_links")
    .select("*, customers(name, client_code, contact_person, phone, whatsapp, email, gstin, city, state_name, remarks)")
    .eq("token", token)
    .maybeSingle();

  if (error || !link) {
    return new NextResponse("Ledger link not found.", { status: 404 });
  }

  if (new Date(link.expires_at).getTime() < Date.now()) {
    return new NextResponse("This ledger link has expired.", { status: 410 });
  }

  await admin
    .from("client_ledger_share_links")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", link.id);

  const customer = Array.isArray(link.customers) ? link.customers[0] : link.customers;
  const ledgerName = link.tally_ledger_name || customer?.name || link.client_name;
  const period = [formatDate(link.period_from), formatDate(link.period_to)].filter((item) => item !== "-").join(" to ") || "Current";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${ledgerName} Ledger</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; }
    main { max-width: 760px; margin: 0 auto; padding: 28px 16px; }
    .card { background: #fff; border: 1px solid #dbe4ef; border-radius: 8px; overflow: hidden; }
    .hero { background: #064e57; color: #fff; padding: 22px; }
    h1 { margin: 0; font-size: 24px; }
    .sub { margin-top: 8px; color: #d9fbff; font-size: 14px; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); padding: 18px; }
    .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .label { color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700; }
    .value { margin-top: 8px; font-size: 18px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    td { padding: 10px 18px; border-top: 1px solid #e2e8f0; font-size: 14px; }
    td:first-child { color: #64748b; width: 38%; }
    .note { padding: 16px 18px; color: #475569; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; }
    .actions { padding: 0 18px 18px; }
    .button { display: inline-block; border-radius: 6px; background: #064e57; color: #fff; padding: 11px 14px; text-decoration: none; font-size: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <div class="hero">
        <h1>${htmlText(ledgerName)}</h1>
        <div class="sub">Ram Setu ERP ledger statement</div>
      </div>
      <div class="grid">
        <div class="box"><div class="label">Outstanding</div><div class="value">${formatAmount(link.outstanding_amount)}</div></div>
        <div class="box"><div class="label">As of</div><div class="value">${formatDate(link.outstanding_as_of || link.created_at)}</div></div>
        <div class="box"><div class="label">Period</div><div class="value">${htmlText(period)}</div></div>
      </div>
      <div class="actions">
        <a class="button" href="/api/client-ledger/${htmlText(token)}/pdf">Download PDF</a>
      </div>
      <table>
        <tr><td>Client code</td><td>${htmlText(customer?.client_code || "-")}</td></tr>
        <tr><td>Contact</td><td>${htmlText(customer?.contact_person || "-")}</td></tr>
        <tr><td>Phone</td><td>${htmlText(customer?.whatsapp || customer?.phone || "-")}</td></tr>
        <tr><td>Email</td><td>${htmlText(customer?.email || "-")}</td></tr>
        <tr><td>GSTIN</td><td>${htmlText(customer?.gstin || "-")}</td></tr>
        <tr><td>City / State</td><td>${htmlText([customer?.city, customer?.state_name].filter(Boolean).join(", ") || "-")}</td></tr>
        <tr><td>Tally ledger</td><td>${htmlText(link.tally_ledger_name || "-")}</td></tr>
      </table>
      <div class="note">
        This link is generated from Ram Setu ERP using synced Tally client data. Please reply on WhatsApp with payment details if payment is already done.
      </div>
    </section>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store"
    }
  });
}
