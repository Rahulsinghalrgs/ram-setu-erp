import { NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/erp-queries";
import { createTextPdf } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/server";

function amount(value: unknown) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export async function GET() {
  const context = await requireModuleAccess("customers");
  const supabase = await createClient();
  const { data: clients } = await (supabase as any)
    .from("customers")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("opening_outstanding", { ascending: false })
    .order("name", { ascending: true });

  const rows = (clients || []) as Record<string, any>[];
  const tallyMapped = rows.filter((client) => client.tally_guid || client.tally_ledger_name).length;
  const whatsappReady = rows.filter((client) => (client.whatsapp_opt_in ?? true) && (client.whatsapp || client.phone)).length;
  const outstanding = rows.reduce((sum, client) => sum + Number(client.opening_outstanding || 0), 0);
  const lines = [
    `Organization: ${context.organization.name}`,
    `Total clients: ${rows.length}`,
    `Tally mapped: ${tallyMapped}`,
    `WhatsApp ready: ${whatsappReady}`,
    `Opening outstanding: ${amount(outstanding)}`,
    "",
    "Top Tally client ledgers by outstanding",
    "Client | Tally ledger | Contact | Outstanding | GSTIN"
  ];

  for (const client of rows.slice(0, 120)) {
    lines.push(
      [
        client.name || "-",
        client.tally_ledger_name || client.tally_guid || "-",
        client.whatsapp || client.phone || "-",
        amount(client.opening_outstanding),
        client.gstin || "-"
      ].join(" | ")
    );
  }

  const pdf = createTextPdf({
    title: "Ram Setu ERP Tally Client Report",
    subtitle: `Generated ${new Date().toLocaleString("en-IN")} from synced Tally client data`,
    lines
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="ram-setu-tally-client-report.pdf"',
      "Cache-Control": "private, no-store"
    }
  });
}

