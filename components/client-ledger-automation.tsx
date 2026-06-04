import { MessageCircle, Send } from "lucide-react";
import { bulkSendClientLedgerWhatsapp, sendClientLedgerWhatsapp } from "@/lib/client-ledger-actions";

type ClientLedgerAutomationProps = {
  clients: Record<string, any>[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function formatAmount(value: unknown) {
  return Number(value || 0).toLocaleString("en-IN");
}

function phoneFor(client: Record<string, any>) {
  return client.whatsapp || client.phone || client.billing_contact_phone || "";
}

export function ClientLedgerAutomation({ clients }: ClientLedgerAutomationProps) {
  const defaultFrom = firstDayOfMonthIso();
  const defaultTo = todayIso();
  const outstandingClients = clients
    .filter((client) => Number(client.opening_outstanding || 0) > 0)
    .sort((a, b) => Number(b.opening_outstanding || 0) - Number(a.opening_outstanding || 0));
  const readyClients = outstandingClients.filter((client) => (client.whatsapp_opt_in ?? true) && phoneFor(client));
  const totalOutstanding = outstandingClients.reduce((sum, client) => sum + Number(client.opening_outstanding || 0), 0);
  const templateName = process.env.WATI_LEDGER_TEMPLATE || "client_ledger_statement";

  return (
    <section className="surface-panel overflow-hidden rounded-md" id="ledger-whatsapp">
      <div className="border-b bg-white px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              WATI WhatsApp Automation
            </p>
            <h2 className="mt-1 text-xl font-semibold">Client ledger sender</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Tally-synced outstanding clients ko approved WATI template se ledger link bhejne ke liye.
            </p>
          </div>
          <form action={bulkSendClientLedgerWhatsapp} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="template_name" value={templateName} />
            <label className="text-xs font-semibold text-muted-foreground">
              From
              <input
                name="period_from"
                type="date"
                defaultValue={defaultFrom}
                className="mt-1 h-10 rounded-md border px-3 text-sm font-normal text-foreground"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              To
              <input
                name="period_to"
                type="date"
                defaultValue={defaultTo}
                className="mt-1 h-10 rounded-md border px-3 text-sm font-normal text-foreground"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Limit
              <input
                name="limit"
                type="number"
                min="1"
                max="100"
                defaultValue="25"
                className="mt-1 h-10 w-20 rounded-md border px-3 text-sm font-normal text-foreground"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Bulk Send
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-3 border-b bg-muted/20 p-4 md:grid-cols-4">
        {[
          ["Outstanding clients", outstandingClients.length, "Balance above zero"],
          ["WhatsApp ready", readyClients.length, "Phone and opt-in OK"],
          ["Outstanding value", `INR ${formatAmount(totalOutstanding)}`, "Current synced amount"],
          ["Template", templateName, "WATI approved name"]
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-md border bg-white p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 text-lg font-semibold">{String(value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
            <tr>
              {["Client", "Tally ledger", "WhatsApp", "Outstanding", "Status", "Action"].map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {outstandingClients.slice(0, 40).map((client) => {
              const phone = phoneFor(client);
              const ready = Boolean(phone && (client.whatsapp_opt_in ?? true));

              return (
                <tr key={client.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.contact_person || client.client_code || "-"}</p>
                  </td>
                  <td className="px-4 py-3">{client.tally_ledger_name || "-"}</td>
                  <td className="px-4 py-3">{phone || "-"}</td>
                  <td className="px-4 py-3 font-semibold">INR {formatAmount(client.opening_outstanding)}</td>
                  <td className="px-4 py-3">
                    <span className={ready ? "text-emerald-700" : "text-amber-700"}>
                      {ready ? "Ready" : "Missing phone/opt-in"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={sendClientLedgerWhatsapp} className="flex items-center gap-2">
                      <input type="hidden" name="customer_id" value={client.id} />
                      <input type="hidden" name="template_name" value={templateName} />
                      <input type="hidden" name="period_from" value={defaultFrom} />
                      <input type="hidden" name="period_to" value={defaultTo} />
                      <button
                        type="submit"
                        disabled={!ready}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold text-primary hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Send Ledger
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!outstandingClients.length ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No outstanding client ledgers ready right now.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

