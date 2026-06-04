"use server";

import { revalidatePath } from "next/cache";
import { sendWatiTemplateMessage } from "@/lib/communication";
import { requireModuleAccess } from "@/lib/erp-queries";
import { createClient } from "@/lib/supabase/server";

function formatAmount(value: FormDataEntryValue | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
}

export async function createPaymentFollowup(formData: FormData) {
  const context = await requireModuleAccess("invoices", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const row = {
    organization_id: context.organization.id,
    bill_key: String(formData.get("bill_key") || ""),
    party_name: String(formData.get("party_name") || ""),
    company: String(formData.get("company") || ""),
    bill_no: String(formData.get("bill_no") || ""),
    mode: String(formData.get("mode") || "Phone Call"),
    status: String(formData.get("status") || "Pending"),
    followup_date: String(formData.get("followup_date") || new Date().toISOString().slice(0, 10)),
    promised_pay_date: String(formData.get("promised_pay_date") || "") || null,
    promised_amount: Number(formData.get("promised_amount") || 0),
    next_followup_date: String(formData.get("next_followup_date") || "") || null,
    remarks: String(formData.get("remarks") || ""),
    created_by: user?.id || null
  };

  if (!row.bill_key || !row.party_name) {
    revalidatePath("/dashboard/invoices");
    return;
  }

  try {
    await db.from("payment_followups").insert(row);
  } catch {
    // The dashboard still works from the sheet while the Supabase migration is being applied.
  }
  revalidatePath("/dashboard/invoices");
}

export async function sendPaymentWhatsappReminder(formData: FormData) {
  const context = await requireModuleAccess("invoices", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const billKey = String(formData.get("bill_key") || "");
  const partyName = String(formData.get("party_name") || "");
  const company = String(formData.get("company") || "");
  const billNo = String(formData.get("bill_no") || "");
  const phone = String(formData.get("phone") || "");
  const contactPerson = String(formData.get("contact_person") || partyName);
  const outstanding = formatAmount(formData.get("outstanding"));
  const dueDate = String(formData.get("due_date") || "-");
  const templateName = String(formData.get("template_name") || process.env.WATI_PAYMENT_TEMPLATE || "payment_followup_reminder");
  const preview = `Payment reminder for ${partyName}, bill ${billNo}, outstanding ${outstanding}, due ${dueDate}.`;

  if (!billKey || !partyName || !phone) {
    revalidatePath("/dashboard/invoices");
    return;
  }

  const result = await sendWatiTemplateMessage({
    phone,
    templateName,
    contactName: contactPerson || partyName,
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
  const providerMessageId = result.ok ? result.providerMessageId : null;

  try {
    await db.from("communication_logs").insert({
      organization_id: context.organization.id,
      channel: "whatsapp",
      provider: "wati",
      workflow: "payment_followup",
      reference_key: billKey,
      recipient_name: partyName,
      recipient_contact: phone,
      template_name: templateName,
      message_preview: preview,
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage || null,
      provider_response: result.providerResponse || result.result || null,
      sent_by: user?.id || null,
      sent_at: result.ok ? new Date().toISOString() : null
    });
  } catch {
    // Communication log is best-effort so payment follow-up workflow stays usable.
  }

  try {
    await db.from("payment_followups").insert({
      organization_id: context.organization.id,
      bill_key: billKey,
      party_name: partyName,
      company,
      bill_no: billNo,
      mode: "WhatsApp",
      status: result.ok ? "WhatsApp Sent" : "WhatsApp Failed",
      remarks: result.ok
        ? `WATI reminder sent using ${templateName}${providerMessageId ? `, message id ${providerMessageId}` : ""}.`
        : `WATI failed: ${errorMessage}`,
      created_by: user?.id || null
    });
  } catch {
    // Follow-up log table may still be under setup in some deployments.
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/settings");
}
