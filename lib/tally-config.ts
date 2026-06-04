import { createClient } from "@/lib/supabase/server";

const requiredReports = [
  { key: "ledger_master", label: "Ledger master" },
  { key: "bills_receivable", label: "Bills receivable" },
  { key: "sales_register", label: "Sales register" },
  { key: "receipt_register", label: "Receipt register" },
  { key: "outstanding_ageing", label: "Outstanding ageing" }
] as const;

type AnyRecord = Record<string, any>;

export type TallyReadinessItem = {
  label: string;
  status: "done" | "pending" | "warning";
  note: string;
};

export type TallyIntegrationReadiness = {
  settings: AnyRecord | null;
  logs: AnyRecord[];
  requiredReports: typeof requiredReports;
  checklist: TallyReadinessItem[];
  error: string | null;
};

function enabledReports(settings: AnyRecord | null) {
  const configured = (settings?.reports_enabled || {}) as Record<string, boolean>;
  return requiredReports.filter((report) => configured[report.key] !== false);
}

function statusLabel(value: boolean, warning = false): "done" | "pending" | "warning" {
  if (value) return "done";
  return warning ? "warning" : "pending";
}

function envCompanyNames() {
  return String(process.env.TALLY_COMPANY_NAMES || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
}

function configuredAccessMethod(settings: AnyRecord | null) {
  const configured = String(settings?.access_method || "");
  if (["xml_api", "rest_api", "manual_csv"].includes(configured)) return configured;
  if (configured === "odbc" && !process.env.TALLY_API_URL) return "odbc";
  if (process.env.TALLY_API_URL) return "xml_api";
  return configured === "odbc" || process.env.TALLY_ODBC_HOST ? "odbc" : "not_confirmed";
}

function configuredEndpoint(settings: AnyRecord | null) {
  const method = configuredAccessMethod(settings);
  const staticIp = String(settings?.static_ip || process.env.TALLY_ODBC_HOST || "").trim();
  if (method === "odbc" && staticIp) {
    const suffix = process.env.TALLY_ODBC_PORT ? `:${process.env.TALLY_ODBC_PORT}` : "";
    return { label: `${staticIp}${suffix}`, type: "odbc" };
  }
  const apiUrl = String(settings?.api_url || process.env.TALLY_API_URL || "").trim();
  if (apiUrl) return { label: apiUrl, type: "api" };
  const browserUrl = String(settings?.browser_url || "").trim();
  if (browserUrl) return { label: browserUrl, type: "browser" };
  if (staticIp) {
    const suffix = process.env.TALLY_ODBC_PORT ? `:${process.env.TALLY_ODBC_PORT}` : "";
    return { label: `${staticIp}${suffix}`, type: "odbc" };
  }
  return { label: "", type: "missing" };
}

function fallbackSettings() {
  const companyNames = envCompanyNames();
  if (!companyNames.length && !process.env.TALLY_API_URL && !process.env.TALLY_ODBC_HOST) return null;

  return {
    provider_name: process.env.TALLY_ODBC_HOST ? "Tally Prime Cloud" : "Tally",
    access_method: configuredAccessMethod(null),
    api_url: process.env.TALLY_API_URL || null,
    static_ip: process.env.TALLY_ODBC_HOST || null,
    company_names: companyNames,
    reports_enabled: {
      ledger_master: true,
      bills_receivable: true,
      sales_register: true,
      receipt_register: true,
      outstanding_ageing: true
    },
    sync_frequency: "manual",
    is_active: Boolean(process.env.TALLY_API_URL)
  };
}

export async function getTallyIntegrationReadiness(
  organizationId: string
): Promise<TallyIntegrationReadiness> {
  const supabase = await createClient();
  const db = supabase as any;

  const [settingsResult, logsResult] = await Promise.all([
    db.from("tally_integration_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
    db
      .from("tally_sync_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(5)
  ]);

  if (settingsResult.error && !isMissingTableError(settingsResult.error)) {
    return {
      settings: null,
      logs: [],
      requiredReports,
      checklist: [],
      error: settingsResult.error.message || "Tally readiness data load failed."
    };
  }

  const settings = (settingsResult.data || null) as AnyRecord | null;
  const logs = logsResult.error ? [] : ((logsResult.data || []) as AnyRecord[]);
  const fallbackCompanies = envCompanyNames();
  const effectiveSettings: AnyRecord | null = settings
    ? {
        ...settings,
        api_url: settings.api_url || process.env.TALLY_API_URL || null,
        static_ip: settings.static_ip || process.env.TALLY_ODBC_HOST || null,
        company_names:
          Array.isArray(settings.company_names) && settings.company_names.length > 0
            ? settings.company_names
            : fallbackCompanies,
        is_active: settings.is_active || Boolean(process.env.TALLY_API_URL)
      }
    : fallbackSettings();
  const reports = enabledReports(effectiveSettings);
  const lastLog = logs[0];
  const hasProvider = Boolean(effectiveSettings?.provider_name);
  const endpoint = configuredEndpoint(effectiveSettings);
  const hasEndpoint = endpoint.type !== "missing";
  const hasCompanies = Array.isArray(effectiveSettings?.company_names) && effectiveSettings.company_names.length > 0;
  const method = configuredAccessMethod(effectiveSettings);
  const hasConfirmedAccess = ["xml_api", "rest_api", "odbc"].includes(method);
  const directSyncReady = ["xml_api", "rest_api"].includes(method) && endpoint.type === "api";

  return {
    settings: effectiveSettings,
    logs,
    requiredReports,
    checklist: [
      {
        label: "Cloud provider",
        status: statusLabel(hasProvider),
        note: hasProvider ? String(effectiveSettings?.provider_name || "") : "Provider name pending"
      },
      {
        label: "Server/API URL",
        status: statusLabel(hasEndpoint),
        note: hasEndpoint ? endpoint.label : "API URL, browser URL, static IP ya TALLY_API_URL pending"
      },
      {
        label: "Access method",
        status: statusLabel(hasConfirmedAccess),
        note: method
      },
      {
        label: "Direct sync mode",
        status: statusLabel(directSyncReady, true),
        note: directSyncReady ? "XML/REST endpoint ready" : "ODBC needs a server-side bridge/API before cloud sync"
      },
      {
        label: "Company names",
        status: statusLabel(hasCompanies),
        note: hasCompanies ? effectiveSettings?.company_names.join(", ") : "Exact Tally company names pending"
      },
      {
        label: "Required reports",
        status: statusLabel(reports.length === requiredReports.length, true),
        note: `${reports.length}/${requiredReports.length} reports enabled`
      },
      {
        label: "Sync logging",
        status: statusLabel(Boolean(lastLog), true),
        note: lastLog
          ? `${lastLog.status} at ${new Date(lastLog.started_at).toLocaleString("en-IN")}`
          : "First sync not run yet"
      }
    ],
    error: null
  };
}

export function tallyReportLabel(key: string) {
  return requiredReports.find((report) => report.key === key)?.label || key;
}
