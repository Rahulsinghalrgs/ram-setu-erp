import { BuyerForm, ClientBulkImportForm } from "@/components/erp-forms";
import { ClientLedgerAutomation } from "@/components/client-ledger-automation";
import { RecordTable } from "@/components/record-table";
import { TallySyncPanel } from "@/components/tally-sync-panel";
import { canAccessModule, getModuleData, requireModuleAccess } from "@/lib/erp-queries";
import { getTallyIntegrationReadiness } from "@/lib/tally-config";
import { Download, FileText } from "lucide-react";

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildClientReportHref(clients: Record<string, any>[]) {
  const headers = [
    "client_code",
    "name",
    "tally_ledger_name",
    "contact_person",
    "phone",
    "whatsapp",
    "email",
    "gstin",
    "city",
    "state_name",
    "credit_limit",
    "credit_days",
    "opening_outstanding",
    "preferred_channel",
    "priority",
    "status",
    "next_follow_up_date",
    "remarks"
  ];
  const body = clients.map((client) => headers.map((header) => csvValue(client[header])).join(","));
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${headers.join(",")}\n${body.join("\n")}\n`)}`;
}

type CustomersPageProps = {
  searchParams?: Promise<{ tallyStatus?: string; tallyMessage?: string }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requireModuleAccess("customers");
  const params = await searchParams;
  const data = await getModuleData();
  const tallyReadiness = await getTallyIntegrationReadiness(data.organization.id);
  const clients = data.customers;
  const activeClients = clients.filter((client) => (client.status || "active") === "active").length;
  const highPriority = clients.filter((client) => ["high", "critical"].includes(client.priority || "")).length;
  const followUpsDue = clients.filter((client) => {
    if (!client.next_follow_up_date) return false;
    return new Date(client.next_follow_up_date) <= new Date();
  }).length;
  const tallyMapped = clients.filter((client) => client.tally_guid || client.tally_ledger_name).length;
  const whatsappReady = clients.filter((client) => {
    const optedIn = client.whatsapp_opt_in ?? true;
    return optedIn && Boolean(client.whatsapp || client.phone || client.billing_contact_phone);
  }).length;
  const openingOutstanding = clients.reduce(
    (sum, client) => sum + Number(client.opening_outstanding || 0),
    0
  );
  const missingContact = clients.filter(
    (client) => !client.phone && !client.whatsapp && !client.email && !client.billing_contact_phone
  ).length;
  const creditRisk = clients.filter(
    (client) => Number(client.opening_outstanding || 0) > 0 && ["high", "critical"].includes(client.priority || "")
  ).length;
  const clientReportHref = buildClientReportHref(clients);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                Sales & CRM
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Client Database</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/85">
                Company details, GST profile, contact hierarchy, credit terms, payment behaviour and next follow-up in one client master.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/reports/tally-clients/pdf"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-blue-50"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Tally PDF
              </a>
              <a
                href={clientReportHref}
                download="ram-setu-client-master-report.csv"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-blue-50"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                CSV Report
              </a>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total clients", clients.length, "Master records"],
            ["Active clients", activeClients, "Ready for orders"],
            ["Tally mapped", tallyMapped, "Ledger linked"],
            ["WhatsApp ready", whatsappReady, "Opt-in contacts"],
            ["Priority accounts", highPriority, "High/Critical"],
            ["Follow-ups due", followUpsDue, "Today or overdue"]
          ].map(([label, value, note]) => (
            <div key={label as string} className="rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">{label as string}</p>
              <p className="mt-3 text-2xl font-semibold">{String(value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note as string}</p>
            </div>
          ))}
        </div>
        <div className="border-t px-4 py-3 text-sm text-muted-foreground">
          <div className="grid gap-2 md:grid-cols-3">
            <p>
              Opening outstanding:{" "}
              <span className="font-semibold text-foreground">
                INR {openingOutstanding.toLocaleString("en-IN")}
              </span>
            </p>
            <p>
              Missing contact records: <span className="font-semibold text-foreground">{missingContact}</span>
            </p>
            <p>
              Credit risk accounts: <span className="font-semibold text-foreground">{creditRisk}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["Single client truth", "Same record payment, order, delivery, requirement and reminder workflow me use hoga."],
          ["Bulk-safe updates", "Tally GUID, client code, GSTIN ya company name se existing record update hota hai."],
          ["Data quality queue", "Missing contacts, overdue follow-ups aur priority accounts dashboard par visible hain."]
        ].map(([title, note]) => (
          <div key={title} className="rounded-md border bg-white/95 p-4 shadow-sm">
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      {canAccessModule(data.access, "customers", "edit") ? (
        <>
          <TallySyncPanel status={params?.tallyStatus} message={params?.tallyMessage} readiness={tallyReadiness} />
          <ClientLedgerAutomation clients={clients} />
          <ClientBulkImportForm />
          <BuyerForm />
        </>
      ) : null}

      <RecordTable
        title="Client Master Register"
        description="Verified client records connected to sales, billing and follow-up workflows."
        columns={["Client", "Tally", "Contact", "GST / PAN", "Credit", "Rules"]}
        rows={clients.map((customer) => [
          `${customer.client_code ? `${customer.client_code} · ` : ""}${customer.name}`,
          customer.tally_ledger_name || customer.tally_guid || "-",
          `${customer.contact_person || "-"}${customer.phone || customer.whatsapp ? ` · ${customer.whatsapp || customer.phone}` : ""}`,
          customer.gstin || "-",
          `INR ${Number(customer.credit_limit || 0).toLocaleString("en-IN")} / ${Number(customer.credit_days || 0)} days`,
          `${customer.preferred_channel || "whatsapp"} · ${customer.status || "active"}`
        ])}
      />
    </div>
  );
}
