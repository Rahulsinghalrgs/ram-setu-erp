import { NextRequest, NextResponse } from "next/server";
import { createTextPdf } from "@/lib/pdf";
import { createAdminClient } from "@/lib/supabase/admin";

function amount(value: unknown) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

  const customer = Array.isArray(link.customers) ? link.customers[0] : link.customers;
  const ledgerName = link.tally_ledger_name || customer?.name || link.client_name;
  const period = [formatDate(link.period_from), formatDate(link.period_to)].filter((item) => item !== "-").join(" to ") || "Current";
  const lines = [
    `Client: ${ledgerName}`,
    `Client code: ${customer?.client_code || "-"}`,
    `Contact: ${customer?.contact_person || "-"}`,
    `Phone: ${customer?.whatsapp || customer?.phone || "-"}`,
    `Email: ${customer?.email || "-"}`,
    `GSTIN: ${customer?.gstin || "-"}`,
    `City / State: ${[customer?.city, customer?.state_name].filter(Boolean).join(", ") || "-"}`,
    `Tally ledger: ${link.tally_ledger_name || "-"}`,
    `Period: ${period}`,
    `Outstanding: ${amount(link.outstanding_amount)}`,
    `Outstanding as of: ${formatDate(link.outstanding_as_of || link.created_at)}`,
    "",
    "This PDF is generated from Ram Setu ERP using synced Tally client data.",
    "If payment is already done, please reply on WhatsApp with payment details."
  ];
  const pdf = createTextPdf({
    title: "Ram Setu ERP Client Ledger",
    subtitle: `${ledgerName} | ${period}`,
    lines
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${String(ledgerName).replace(/[^a-z0-9]+/gi, "-").slice(0, 60) || "client"}-ledger.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}

