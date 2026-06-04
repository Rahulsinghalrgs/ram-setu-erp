"use server";

import { revalidatePath } from "next/cache";
import { sendWatiTemplateMessage } from "@/lib/communication";
import { requireModuleAccess } from "@/lib/erp-queries";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function normalizeDate(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeStatus(value: string) {
  const key = normalizeKey(value);
  return ["scheduled", "sent", "done", "failed", "paused", "cancelled"].includes(key) ? key : "scheduled";
}

function normalizePriority(value: string) {
  const key = normalizeKey(value);
  return ["low", "medium", "high", "critical"].includes(key) ? key : "medium";
}

function normalizeChannel(value: string) {
  const key = normalizeKey(value);
  return ["whatsapp", "email", "call", "internal"].includes(key) ? key : "whatsapp";
}

const watiTemplateParameters: Record<string, string[]> = {
  payment_followup_reminder: ["contact_person", "party_name", "bill_no", "outstanding_amount", "due_date"],
  order_received_confirmation: ["contact_person", "party_name", "order_no", "item_name", "quantity"],
  order_dispatch_update: ["contact_person", "party_name", "order_no", "dispatch_date", "transport_detail"],
  order_delivery_feedback: ["contact_person", "party_name", "order_no", "delivery_date"],
  product_requirement_followup: ["contact_person", "party_name", "product_name", "quantity"],
  general_business_followup: ["contact_person", "party_name", "reference_no", "followup_purpose"]
};

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const reminderAliases: Record<string, string> = {
  party: "client_name",
  party_name: "client_name",
  customer: "client_name",
  customer_name: "client_name",
  client: "client_name",
  company: "client_name",
  mobile: "phone",
  whatsapp: "phone",
  phone_number: "phone",
  bill: "reference_key",
  bill_no: "reference_key",
  invoice: "reference_key",
  invoice_no: "reference_key",
  order: "reference_key",
  order_no: "reference_key",
  followup_date: "due_date",
  next_followup_date: "due_date",
  reminder_date: "due_date",
  template: "template_name",
  message: "message_preview",
  note: "remarks"
};

function normalizeReminderRow(headers: string[], values: string[]) {
  return headers.reduce<Record<string, string>>((row, header, index) => {
    const key = normalizeKey(header);
    const field = reminderAliases[key] || key;
    row[field] = values[index] || "";
    return row;
  }, {});
}

function buildReminderPayload(organizationId: string, row: Record<string, string>) {
  const dueDate = normalizeDate(row.due_date || "");
  if (!row.client_name?.trim()) {
    throw new Error("Client/party name missing hai.");
  }
  if (!dueDate) {
    throw new Error(`${row.client_name}: valid due_date required hai.`);
  }

  return {
    organization_id: organizationId,
    workflow: normalizeKey(row.workflow || "general_follow_up"),
    reference_key: row.reference_key || null,
    client_name: row.client_name,
    contact_person: row.contact_person || null,
    phone: row.phone || null,
    email: row.email || null,
    channel: normalizeChannel(row.channel || ""),
    template_name: row.template_name || null,
    subject: row.subject || null,
    message_preview: row.message_preview || null,
    due_date: dueDate,
    priority: normalizePriority(row.priority || ""),
    status: normalizeStatus(row.status || ""),
    owner_name: row.owner_name || null,
    remarks: row.remarks || null
  };
}

export async function sendTestWatiTemplate(formData: FormData) {
  const context = await requireModuleAccess("reports", "edit");
  const phone = String(formData.get("phone") || "");
  const templateName = String(formData.get("template_name") || "payment_followup_reminder");
  const preview = String(formData.get("preview") || "");
  const rawParameters = String(formData.get("parameters") || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const templateParameterNames = watiTemplateParameters[templateName];
  const parameters = templateParameterNames
    ? templateParameterNames.map((name, index) => ({
        name,
        value: rawParameters[index] || "-"
      }))
    : rawParameters;
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let status = "failed";
  let errorMessage = "";
  const result: Awaited<ReturnType<typeof sendWatiTemplateMessage>> = phone && templateName
    ? await sendWatiTemplateMessage({
        phone,
        templateName,
        contactName: rawParameters[0] || "Test recipient",
        parameters
      })
    : { ok: false, error: "Phone and template name required.", providerResponse: null };

  if (result.ok) {
    status = "sent";
  } else {
    errorMessage = result.error || "WATI send failed.";
  }
  const providerMessageId = result.ok ? result.providerMessageId : null;

  try {
    await db.from("communication_logs").insert({
      organization_id: context.organization.id,
      channel: "whatsapp",
      provider: "wati",
      workflow: "test",
      recipient_name: "Test recipient",
      recipient_contact: phone,
      template_name: templateName,
      message_preview: preview,
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage || null,
      provider_response: result.providerResponse || result.result || null,
      sent_by: user?.id || null,
      sent_at: status === "sent" ? new Date().toISOString() : null
    });
  } catch {
    // Communication dashboard still shows configuration status while migration is being applied.
  }

  revalidatePath("/dashboard/settings");
}

export async function createWorkflowReminder(formData: FormData) {
  const context = await requireModuleAccess("reports", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const payload = {
    ...buildReminderPayload(context.organization.id, {
      workflow: text(formData, "workflow"),
      reference_key: text(formData, "reference_key"),
      client_name: text(formData, "client_name"),
      contact_person: text(formData, "contact_person"),
      phone: text(formData, "phone"),
      email: text(formData, "email"),
      channel: text(formData, "channel"),
      template_name: text(formData, "template_name"),
      subject: text(formData, "subject"),
      message_preview: text(formData, "message_preview"),
      due_date: text(formData, "due_date"),
      priority: text(formData, "priority"),
      status: text(formData, "status"),
      owner_name: text(formData, "owner_name"),
      remarks: text(formData, "remarks")
    }),
    created_by: user?.id || null
  };

  const { error } = await db.from("workflow_reminders").insert(payload);
  if (error) throw new Error(`Reminder save failed: ${error.message}`);

  revalidatePath("/dashboard/settings");
}

export async function bulkImportWorkflowReminders(formData: FormData) {
  const context = await requireModuleAccess("reports", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const csvFile = formData.get("reminder_csv");
  const pastedCsv = text(formData, "reminder_csv_text");
  const csvText = csvFile instanceof File && csvFile.size > 0 ? await csvFile.text() : pastedCsv;

  if (!csvText.trim()) {
    throw new Error("CSV file ya pasted reminder data required hai.");
  }

  const [headers, ...rows] = parseCsv(csvText);
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur kam se kam ek reminder row honi chahiye.");
  }

  const payloads = rows
    .map((row) => normalizeReminderRow(headers, row))
    .filter((row) => row.client_name?.trim())
    .map((row) => buildReminderPayload(context.organization.id, row));

  if (!payloads.length) {
    throw new Error("CSV me client_name/company column nahi mila.");
  }

  const { error } = await db.from("workflow_reminders").insert(payloads);
  if (error) throw new Error(`Reminder bulk import failed: ${error.message}`);

  revalidatePath("/dashboard/settings");
}

export async function updateWorkflowReminder(formData: FormData) {
  await requireModuleAccess("reports", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const id = text(formData, "id");

  if (!id) throw new Error("Reminder ID missing hai.");

  const { error } = await db
    .from("workflow_reminders")
    .update({
      status: normalizeStatus(text(formData, "status")),
      priority: normalizePriority(text(formData, "priority")),
      due_date: normalizeDate(text(formData, "due_date")),
      remarks: text(formData, "remarks") || null
    })
    .eq("id", id);

  if (error) throw new Error(`Reminder update failed: ${error.message}`);

  revalidatePath("/dashboard/settings");
}
