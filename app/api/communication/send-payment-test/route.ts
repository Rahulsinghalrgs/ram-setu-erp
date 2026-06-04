import { NextRequest, NextResponse } from "next/server";
import { sendWatiTemplateMessage } from "@/lib/communication";
import { requireModuleAccess } from "@/lib/erp-queries";
import { createClient } from "@/lib/supabase/server";

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 4 ? `${digits.slice(0, 2)}******${digits.slice(-4)}` : "masked";
}

function redactProvider(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactProvider);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      if (/phone|whatsapp|waid|mobile|contact/i.test(key) && typeof item === "string") {
        return [key, maskPhone(item)];
      }
      if (/token|authorization|secret/i.test(key)) return [key, "redacted"];
      return [key, redactProvider(item)];
    })
  );
}

export async function GET(request: NextRequest) {
  const context = await requireModuleAccess("invoices", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const phone = request.nextUrl.searchParams.get("phone") || "917303240489";
  const templateName = request.nextUrl.searchParams.get("template") || process.env.WATI_PAYMENT_TEMPLATE || "payment_followup_reminder";
  const partyName = "ABC Traders Pvt Ltd";
  const contactPerson = "Mr. Rajesh Kumar";
  const billNo = "INV-2025/0234";
  const outstanding = formatAmount(100000);
  const dueDate = "17-Mar-2026";

  const result = await sendWatiTemplateMessage({
    phone,
    templateName,
    contactName: contactPerson,
    parameters: [
      { name: "contact_person", value: contactPerson },
      { name: "party_name", value: partyName },
      { name: "bill_no", value: billNo },
      { name: "outstanding_amount", value: outstanding },
      { name: "due_date", value: dueDate }
    ]
  });

  const status = result.ok ? "sent" : "failed";
  const errorMessage = result.ok ? "" : result.error || "WATI request failed.";

  try {
    await db.from("communication_logs").insert({
      organization_id: context.organization.id,
      channel: "whatsapp",
      provider: "wati",
      workflow: "payment_followup",
      reference_key: "test-payment-followup",
      recipient_name: partyName,
      recipient_contact: phone,
      template_name: templateName,
      message_preview: `Test payment reminder for ${partyName}, ${billNo}, ${outstanding}, due ${dueDate}.`,
      status,
      provider_message_id: result.ok ? result.providerMessageId : null,
      error_message: errorMessage || null,
      provider_response: result.providerResponse || result.result || null,
      sent_by: user?.id || null,
      sent_at: result.ok ? new Date().toISOString() : null
    });
  } catch {
    // The send result is still returned even if the audit log table is unavailable.
  }

  return NextResponse.json({
    ok: result.ok,
    status,
    recipient: maskPhone(phone),
    templateName,
    providerMessageId: result.ok ? result.providerMessageId : null,
    error: result.ok ? null : errorMessage,
    provider: result.ok ? redactProvider(result.result) : null
  });
}
