"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncTallyBridgeWithErp, testTallyBridge } from "@/lib/tally-bridge-integration";
import { syncTallyWithErp, testTallyConnection } from "@/lib/tally-integration";

async function requireTallyAccess() {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data } = await db
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data?.organization_id) {
    redirect("/dashboard/setup");
  }

  if (!["owner", "admin"].includes(data.role)) {
    const { data: permission } = await db
      .from("organization_member_permissions")
      .select("can_edit")
      .eq("organization_id", data.organization_id)
      .eq("user_id", user.id)
      .eq("module_key", "customers")
      .limit(1)
      .maybeSingle();

    if (!permission?.can_edit) {
      redirect("/dashboard");
    }
  }

  return { supabase: db, organizationId: data.organization_id as string };
}

function encodeMessage(value: string) {
  return encodeURIComponent(value).slice(0, 900);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function parseCompanyNames(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function envCompanyNames() {
  return parseCompanyNames(process.env.TALLY_COMPANY_NAMES || "");
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
}

function reportSettings(formData: FormData) {
  return {
    ledger_master: formData.get("report_ledger_master") === "on",
    bills_receivable: formData.get("report_bills_receivable") === "on",
    sales_register: formData.get("report_sales_register") === "on",
    receipt_register: formData.get("report_receipt_register") === "on",
    outstanding_ageing: formData.get("report_outstanding_ageing") === "on"
  };
}

function normalizeApiUrl(settings: any) {
  const savedUrl = String(settings?.api_url || "").trim();
  if (savedUrl) return savedUrl;
  const envUrl = String(process.env.TALLY_API_URL || "").trim();
  if (envUrl) return envUrl;
  const staticIp = String(settings?.static_ip || "").trim();
  if (!staticIp) return null;
  return /^https?:\/\//i.test(staticIp) ? staticIp : `http://${staticIp}`;
}

function accessMethod(settings: any) {
  const configured = String(settings?.access_method || "");
  if (["xml_api", "rest_api", "manual_csv"].includes(configured)) return configured;
  if (configured === "odbc" && !process.env.TALLY_API_URL) return "odbc";
  if (process.env.TALLY_API_URL) return "xml_api";
  return configured === "odbc" || process.env.TALLY_ODBC_HOST ? "odbc" : "xml_api";
}

function odbcEndpoint(settings: any) {
  const host = String(settings?.static_ip || process.env.TALLY_ODBC_HOST || "").trim();
  const port = String(process.env.TALLY_ODBC_PORT || "6456").trim();
  return host ? `${host}:${port}` : "ODBC endpoint";
}

function configuredCompanyNames(settings: any) {
  return Array.isArray(settings?.company_names) && settings.company_names.length > 0
    ? settings.company_names
    : envCompanyNames();
}

async function getTallySettings(supabase: any, organizationId: string) {
  try {
    const { data } = await supabase
      .from("tally_integration_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

async function createSyncLog(supabase: any, organizationId: string, settings: any) {
  try {
    const { data } = await supabase
      .from("tally_sync_logs")
      .insert({
        organization_id: organizationId,
        status: "running",
        access_method: settings?.access_method || "xml_api",
        provider_name: settings?.provider_name || null,
        company_names:
          Array.isArray(settings?.company_names) && settings.company_names.length > 0
            ? settings.company_names
            : envCompanyNames()
      })
      .select("id")
      .single();
    return data?.id as string | undefined;
  } catch {
    return undefined;
  }
}

async function finishSyncLog(
  supabase: any,
  logId: string | undefined,
  status: "success" | "error",
  message: string,
  result?: {
    ledgersRead: number;
    clientsUpserted: number;
    vouchersRead: number;
    invoicesUpserted: number;
    paymentsCreated: number;
    warnings: string[];
  }
) {
  if (!logId) return;
  try {
    await supabase
      .from("tally_sync_logs")
      .update({
        status,
        message,
        finished_at: new Date().toISOString(),
        ledgers_read: result?.ledgersRead || 0,
        clients_upserted: result?.clientsUpserted || 0,
        vouchers_read: result?.vouchersRead || 0,
        invoices_upserted: result?.invoicesUpserted || 0,
        payments_created: result?.paymentsCreated || 0,
        warnings: result?.warnings || []
      })
      .eq("id", logId);
  } catch {
    // Sync should not fail just because the audit log table is unavailable.
  }
}

export async function saveTallyIntegrationSettings(formData: FormData) {
  const { supabase, organizationId } = await requireTallyAccess();
  const companyNames = parseCompanyNames(text(formData, "company_names"));
  const fallbackCompanies = envCompanyNames();
  const payload = {
    organization_id: organizationId,
    provider_name: text(formData, "provider_name") || null,
    access_method: text(formData, "access_method") || "not_confirmed",
    browser_url: text(formData, "browser_url") || null,
    api_url: text(formData, "api_url") || null,
    static_ip: text(formData, "static_ip") || null,
    company_names: companyNames.length ? companyNames : fallbackCompanies,
    reports_enabled: reportSettings(formData),
    sync_frequency: text(formData, "sync_frequency") || "manual",
    sync_time: text(formData, "sync_time") || null,
    provider_notes: text(formData, "provider_notes") || null,
    is_active: formData.get("is_active") === "on"
  };

  const { error } = await supabase.from("tally_integration_settings").upsert(payload, {
    onConflict: "organization_id"
  });

  const missingReadinessTable = error && isMissingTableError(error);
  const status = error && !missingReadinessTable ? "error" : "success";
  const message = error
    ? missingReadinessTable
      ? "Tally settings env fallback se ready hain. Readiness tables pending hain, lekin sync button chalega."
      : `Tally settings save failed: ${error.message}`
    : "Tally provider settings saved.";
  redirect(`/dashboard/customers?tallyStatus=${status}&tallyMessage=${encodeMessage(message)}`);
}

export async function syncTallyFromLocalApi() {
  const { supabase, organizationId } = await requireTallyAccess();
  let status = "success";
  let message = "";
  const settings = await getTallySettings(supabase, organizationId);
  const logId = await createSyncLog(supabase, organizationId, settings);
  const apiUrl = normalizeApiUrl(settings);
  const method = accessMethod(settings);

  try {
    if (method === "rest_api") {
      const result = await syncTallyBridgeWithErp(supabase, organizationId, {
        bridgeUrl: apiUrl,
        companyNames: configuredCompanyNames(settings)
      });
      revalidatePath("/dashboard/customers");
      revalidatePath("/dashboard/invoices");
      revalidatePath("/dashboard");
      message = `Tally bridge sync done: ${result.clientsUpserted} clients, ${result.invoicesUpserted} invoices, ${result.paymentsCreated} receipts. ${result.warnings.join(" ")}`;
      await finishSyncLog(supabase, logId, "success", message, result);
      redirect(`/dashboard/customers?tallyStatus=${status}&tallyMessage=${encodeMessage(message)}`);
    }

    if (method === "odbc") {
      throw new Error(
        `Tally ne ODBC ${odbcEndpoint(settings)} diya hai. Vercel ERP direct ODBC driver se connect nahi kar sakta; XML API/REST bridge URL chahiye.`
      );
    }
    const result = await syncTallyWithErp(supabase, organizationId, {
      apiUrl,
      companyNames: configuredCompanyNames(settings)
    });
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard");
    message = `Tally sync done: ${result.clientsUpserted} clients, ${result.invoicesUpserted} invoices, ${result.paymentsCreated} receipts. ${result.warnings.join(" ")}`;
    await finishSyncLog(supabase, logId, "success", message, result);
  } catch (error) {
    status = "error";
    message = error instanceof Error ? error.message : "Tally sync failed.";
    await finishSyncLog(supabase, logId, "error", message);
  }

  redirect(`/dashboard/customers?tallyStatus=${status}&tallyMessage=${encodeMessage(message)}`);
}

export async function testTallyApiConnection() {
  const { supabase, organizationId } = await requireTallyAccess();
  let status = "success";
  let message = "";
  const settings = await getTallySettings(supabase, organizationId);
  const apiUrl = normalizeApiUrl(settings);
  const method = accessMethod(settings);

  try {
    if (method === "rest_api") {
      const result = await testTallyBridge({
        bridgeUrl: apiUrl,
        companyNames: configuredCompanyNames(settings)
      });
      message = `Tally bridge OK: ${result.endpoint}. Companies: ${result.companies.join(", ") || "not returned"}.`;
      redirect(`/dashboard/customers?tallyStatus=${status}&tallyMessage=${encodeMessage(message)}`);
    }

    if (method === "odbc") {
      throw new Error(
        `ODBC ${odbcEndpoint(settings)} record ho gaya, lekin browser/cloud ERP se direct ODBC test nahi chalega. Tally team se XML API/REST bridge endpoint lo.`
      );
    }
    const result = await testTallyConnection(apiUrl, configuredCompanyNames(settings));
    message = `Tally connection OK: ${result.endpoint} responded in ${result.elapsedMs}ms. Companies found: ${result.companyCount}.`;
    if (result.foundCompanies?.length) {
      message += ` Loaded: ${result.foundCompanies.join(", ")}.`;
    }
    if (result.missingCompanies?.length) {
      message += ` Missing: ${result.missingCompanies.join(", ")}. Tally me ye companies load/open karni hongi.`;
    }
    if (!result.companyCount) {
      message += " Response aaya, lekin company list empty hai; Tally me target company open/loaded confirm karo.";
    }
  } catch (error) {
    status = "error";
    message = error instanceof Error ? error.message : "Tally connection test failed.";
  }

  redirect(`/dashboard/customers?tallyStatus=${status}&tallyMessage=${encodeMessage(message)}`);
}
