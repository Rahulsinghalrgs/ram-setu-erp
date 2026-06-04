"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { sendWatiTemplateMessage } from "@/lib/communication";
import { requireModuleAccess } from "@/lib/erp-queries";
import { createClient } from "@/lib/supabase/server";

type CustomerRow = Record<string, any>;

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "";
  if (configured) return configured.startsWith("http") ? configured.replace(/\/+$/, "") : `https://${configured.replace(/\/+$/, "")}`;
  return "https://ram-setu-erp-ruddy.vercel.app";
}

function formatAmount(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function customerPhone(customer: CustomerRow) {
  return String(customer.whatsapp || customer.phone || customer.billing_contact_phone || "").trim();
}

function contactPerson(customer: CustomerRow) {
  return String(customer.contact_person || customer.billing_contact || customer.name || "").trim();
}

async function createLedgerLink({
  db,
  organizationId,
  customer,
  periodFrom,
  periodTo,
  userId
}: {
  db: any;
  organizationId: string;
  customer: CustomerRow;
  periodFrom: string;
  periodTo: string;
  userId: string | null;
}) {
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const { error } = await db.from("client_ledger_share_links").insert({
    organization_id: organizationId,
    customer_id: customer.id,
    token,
    client_name: customer.name,
    tally_ledger_name: customer.tally_ledger_name || customer.name,
    period_from: periodFrom || null,
    period_to: periodTo || null,
    outstanding_amount: Number(customer.opening_outstanding || 0),
    outstanding_as_of: customer.outstanding_as_of || todayIso(),
    created_by: userId
  });

  if (error) throw new Error(`Ledger link save failed: ${error.message}`);
  return `${appBaseUrl()}/api/client-ledger/${token}`;
}

async function sendLedgerForCustomer({
  db,
  organizationId,
  userId,
  customer,
  periodFrom,
  periodTo,
  templateName
}: {
  db: any;
  organizationId: string;
  userId: string | null;
  customer: CustomerRow;
  periodFrom: string;
  periodTo: string;
  templateName: string;
}) {
  const phone = customerPhone(customer);
  const optedIn = customer.whatsapp_opt_in ?? true;
  const outstandingAmount = Number(customer.opening_outstanding || 0);
  const referenceKey = String(customer.id);
  const periodLabel = `${periodFrom || firstDayOfMonthIso()} to ${periodTo || todayIso()}`;

  if (!phone || !optedIn) {
    const reason = !phone ? "WhatsApp/phone missing." : "WhatsApp opt-in disabled.";
    await db.from("communication_logs").insert({
      organization_id: organizationId,
      channel: "whatsapp",
      provider: "wati",
      workflow: "client_ledger",
      reference_key: referenceKey,
      recipient_name: customer.name,
      recipient_contact: phone || "-",
      template_name: templateName,
      message_preview: `Ledger send skipped for ${customer.name}: ${reason}`,
      status: "skipped",
      error_message: reason,
      sent_by: userId
    });
    return { ok: false, skipped: true, error: reason };
  }

  const ledgerLink = await createLedgerLink({
    db,
    organizationId,
    customer,
    periodFrom,
    periodTo,
    userId
  });
  const amount = formatAmount(outstandingAmount);
  const preview = `Ledger for ${customer.name}, period ${periodLabel}, outstanding ${amount}.`;
  const result = await sendWatiTemplateMessage({
    phone,
    templateName,
    contactName: contactPerson(customer) || customer.name,
    parameters: [
      { name: "contact_person", value: contactPerson(customer) || customer.name },
      { name: "client_name", value: customer.name },
      { name: "ledger_period", value: periodLabel },
      { name: "outstanding_amount", value: amount },
      { name: "ledger_link", value: ledgerLink }
    ]
  });
  const status = result.ok ? "sent" : "failed";
  const errorMessage = result.ok ? "" : result.error || "WATI ledger send failed.";

  await db.from("communication_logs").insert({
    organization_id: organizationId,
    channel: "whatsapp",
    provider: "wati",
    workflow: "client_ledger",
    reference_key: referenceKey,
    recipient_name: customer.name,
    recipient_contact: phone,
    template_name: templateName,
    message_preview: preview,
    status,
    provider_message_id: result.ok ? result.providerMessageId : null,
    error_message: errorMessage || null,
    provider_response: result.providerResponse || result.result || null,
    sent_by: userId,
    sent_at: result.ok ? new Date().toISOString() : null
  });

  return { ok: result.ok, skipped: false, error: errorMessage };
}

export async function sendClientLedgerWhatsapp(formData: FormData) {
  const context = await requireModuleAccess("customers", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const customerId = String(formData.get("customer_id") || "");
  const periodFrom = String(formData.get("period_from") || firstDayOfMonthIso());
  const periodTo = String(formData.get("period_to") || todayIso());
  const templateName = String(formData.get("template_name") || process.env.WATI_LEDGER_TEMPLATE || "client_ledger_statement");

  if (!customerId) {
    revalidatePath("/dashboard/customers");
    return;
  }

  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", customerId)
    .maybeSingle();

  if (customer) {
    await sendLedgerForCustomer({
      db,
      organizationId: context.organization.id,
      userId: user?.id || null,
      customer,
      periodFrom,
      periodTo,
      templateName
    });
  }

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/settings");
}

export async function bulkSendClientLedgerWhatsapp(formData: FormData) {
  const context = await requireModuleAccess("customers", "edit");
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const periodFrom = String(formData.get("period_from") || firstDayOfMonthIso());
  const periodTo = String(formData.get("period_to") || todayIso());
  const templateName = String(formData.get("template_name") || process.env.WATI_LEDGER_TEMPLATE || "client_ledger_statement");
  const limit = Math.max(1, Math.min(Number(formData.get("limit") || 25), 100));

  const { data: customers } = await db
    .from("customers")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("status", "active")
    .gt("opening_outstanding", 0)
    .order("opening_outstanding", { ascending: false })
    .limit(limit);

  for (const customer of customers || []) {
    await sendLedgerForCustomer({
      db,
      organizationId: context.organization.id,
      userId: user?.id || null,
      customer,
      periodFrom,
      periodTo,
      templateName
    });
  }

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/settings");
}

