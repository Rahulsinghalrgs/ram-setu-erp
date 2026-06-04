import { CheckCircle2, Clock3, PlugZap, RefreshCw, Save, ShieldCheck, TriangleAlert } from "lucide-react";
import { saveTallyIntegrationSettings, syncTallyFromLocalApi, testTallyApiConnection } from "@/lib/tally-actions";
import type { TallyIntegrationReadiness } from "@/lib/tally-config";

type TallySyncPanelProps = {
  status?: string;
  message?: string;
  readiness?: TallyIntegrationReadiness;
};

function fieldClassName() {
  return "mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
}

function reportEnabled(readiness: TallyIntegrationReadiness | undefined, key: string) {
  const settings = readiness?.settings;
  if (!settings?.reports_enabled) return true;
  return settings.reports_enabled[key] !== false;
}

function itemIcon(status: "done" | "pending" | "warning") {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  if (status === "warning") return <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />;
  return <Clock3 className="h-4 w-4 text-slate-500" aria-hidden="true" />;
}

export function TallySyncPanel({ status, message, readiness }: TallySyncPanelProps) {
  const tone =
    status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : status === "error"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-blue-100 bg-blue-50 text-blue-950";

  const settings = readiness?.settings;
  const logs = readiness?.logs || [];
  const companyNames = Array.isArray(settings?.company_names) ? settings.company_names.join("\n") : "";

  return (
    <section id="tally-sync" className="scroll-mt-20 space-y-4 rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tally Integration
          </p>
          <h2 className="mt-1 text-lg font-semibold">Tally cloud readiness and sync</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Provider details, access method, company names, reports, security and sync logs ek jagah maintain honge.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={testTallyApiConnection}>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-blue-50">
              <PlugZap className="h-4 w-4" aria-hidden="true" />
              Test connection
            </button>
          </form>
          <form action={syncTallyFromLocalApi}>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Sync from Tally
            </button>
          </form>
        </div>
      </div>
      {message ? (
        <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${tone}`}>
          {message}
        </p>
      ) : null}

      {readiness?.error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sync manual button se chalega. Checklist/log history ke liye Supabase readiness tables pending hain.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {(readiness?.checklist || []).map((item) => (
          <div key={item.label} className="flex gap-3 rounded-md border bg-muted/30 p-3">
            <div className="mt-0.5">{itemIcon(item.status)}</div>
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
            </div>
          </div>
        ))}
      </div>

      <form action={saveTallyIntegrationSettings} className="rounded-md border bg-muted/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">Provider setup</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Cloud provider</span>
            <input name="provider_name" defaultValue={settings?.provider_name || ""} placeholder="Tally cloud provider" className={fieldClassName()} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Access method</span>
            <select name="access_method" defaultValue={settings?.access_method || "xml_api"} className={fieldClassName()}>
              <option value="xml_api">XML API</option>
              <option value="rest_api">REST API</option>
              <option value="odbc">ODBC</option>
              <option value="manual_csv">Manual CSV</option>
              <option value="not_confirmed">Not confirmed</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Sync mode</span>
            <select name="sync_frequency" defaultValue="manual" className={fieldClassName()}>
              <option value="manual">Manual from this panel</option>
            </select>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Auto schedule bridge setup ke baad enable hoga.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Browser URL</span>
            <input name="browser_url" defaultValue={settings?.browser_url || ""} placeholder="https://..." className={fieldClassName()} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">API / server URL</span>
            <input name="api_url" defaultValue={settings?.api_url || ""} placeholder="http://43.231.249.107:65430" className={fieldClassName()} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Static IP / ODBC host</span>
            <input name="static_ip" defaultValue={settings?.static_ip || ""} placeholder="v60069.22166.tallyprimecloud.in" className={fieldClassName()} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Daily sync time</span>
            <input name="sync_time" type="time" defaultValue={settings?.sync_time || ""} className={fieldClassName()} />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium">Exact Tally company names</span>
            <textarea
              name="company_names"
              defaultValue={companyNames}
              placeholder="Richa Global Sales (25-26)&#10;Richa Industries"
              className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-5">
          {(readiness?.requiredReports || []).map((report) => (
            <label key={report.key} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-xs font-medium">
              <input name={`report_${report.key}`} type="checkbox" defaultChecked={reportEnabled(readiness, report.key)} className="h-4 w-4 accent-blue-700" />
              {report.label}
            </label>
          ))}
        </div>

        <label className="mt-3 block text-sm">
          <span className="font-medium">Provider notes</span>
          <textarea
            name="provider_notes"
            defaultValue={settings?.provider_notes || ""}
            placeholder="ODBC port 6456, VPN, whitelist, API key owner, support contact"
            className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={Boolean(settings?.is_active || settings?.api_url)}
              className="h-4 w-4 accent-blue-700"
            />
            Active integration
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/90">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save settings
          </button>
        </div>
      </form>

      {logs.length ? (
        <div className="rounded-md border">
          <div className="border-b px-3 py-2 text-sm font-semibold">Recent sync logs</div>
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="grid gap-2 px-3 py-2 text-sm md:grid-cols-5">
                <span className="font-medium">{log.status}</span>
                <span>{new Date(log.started_at).toLocaleString("en-IN")}</span>
                <span>{Number(log.clients_upserted || 0)} clients</span>
                <span>{Number(log.invoices_upserted || 0)} invoices</span>
                <span className="text-muted-foreground">{log.message || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
