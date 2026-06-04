import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  MessageCircle,
  PhoneCall,
  TrendingUp
} from "lucide-react";
import { createPaymentFollowup, sendPaymentWhatsappReminder } from "@/lib/payment-followup-actions";
import {
  getPaymentFollowupLogs,
  getPaymentSheetData,
  getPaymentSummary,
  type PaymentBill
} from "@/lib/payment-followup";
import type { AppContext } from "@/lib/erp-queries";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function formatAmount(value: number) {
  return currencyFormatter.format(value);
}

function priorityTone(priority: string) {
  const value = priority.toLowerCase();
  if (value.includes("critical")) return "bg-rose-50 text-rose-700";
  if (value.includes("high")) return "bg-amber-50 text-amber-700";
  if (value.includes("medium")) return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes("paid")) return "bg-emerald-50 text-emerald-700";
  if (value.includes("dispute")) return "bg-rose-50 text-rose-700";
  if (value.includes("promise")) return "bg-blue-50 text-blue-700";
  if (value.includes("escal")) return "bg-orange-50 text-orange-700";
  return "bg-slate-100 text-slate-700";
}

function whatsappLink(bill: PaymentBill) {
  const phone = bill.phone.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Namaste ${bill.contactPerson !== "-" ? bill.contactPerson : bill.partyName}, payment follow-up for ${bill.billNo}: outstanding ${formatAmount(bill.outstanding)}. Please confirm payment date.`
  );
  return phone ? `https://wa.me/${phone}?text=${message}` : "#";
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return `${digits.slice(0, 2)}******${digits.slice(-4)}`;
}

type PaymentFollowupDashboardProps = {
  context: AppContext;
};

export async function PaymentFollowupDashboard({ context }: PaymentFollowupDashboardProps) {
  const [sheet, followups] = await Promise.all([
    getPaymentSheetData(),
    getPaymentFollowupLogs(context.organization.id)
  ]);
  const summary = getPaymentSummary(sheet.bills, followups.logs);
  const latestByBill = new Map(followups.logs.map((log) => [log.bill_key, log]));
  const priorityBills = sheet.bills
    .slice()
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.outstanding - a.outstanding)
    .slice(0, 12);
  const canEdit = context.isAdmin || Boolean(context.permissions.invoices?.canEdit);

  const metrics = [
    { label: "Total outstanding", value: formatAmount(summary.totalOutstanding), note: `${summary.openBills} open bills`, icon: IndianRupee },
    { label: "Critical follow-ups", value: summary.criticalBills, note: "High/Critical priority", icon: AlertTriangle },
    { label: "Pending first touch", value: summary.pendingFollowups, note: "No Supabase log yet", icon: PhoneCall },
    { label: "> 90 days risk", value: formatAmount(summary.overdue90), note: "Old receivable exposure", icon: TrendingUp },
    { label: "Promised amount", value: formatAmount(summary.promisedAmount), note: "Logged promise value", icon: CalendarClock }
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                Accounts & Billing
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Payment Follow-up Command Center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/82">
                Tally receivables import, ageing, priority and secure Supabase follow-up history ek screen me.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-md border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              </div>
            );
          })}
        </div>

        {(sheet.error || followups.error) && (
          <div className="mx-4 mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Setup attention</p>
            <p className="mt-1">{sheet.error || followups.error}</p>
          </div>
        )}
      </section>

      <section className="rounded-md border bg-white/95 shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-xl font-semibold">Priority Payment Queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">Highest risk parties from outstanding import, merged with latest Supabase follow-up log.</p>
        </div>
        <div className="divide-y">
          {priorityBills.map((bill) => {
            const latest = latestByBill.get(bill.billKey);
            const currentStatus = latest?.status || bill.status;

            return (
              <div key={bill.billKey} className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {bill.company}
                        </p>
                        <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${priorityTone(bill.priority)}`}>
                          {bill.priority}
                        </span>
                        <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${statusTone(currentStatus)}`}>
                          {currentStatus}
                        </span>
                      </div>
                      <h3 className="mt-2 max-w-2xl truncate text-lg font-semibold">{bill.partyName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {bill.contactPerson !== "-" ? bill.contactPerson : "Contact pending"} · Bill {bill.billNo}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-semibold">{formatAmount(bill.outstanding)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {bill.dueDate} · {bill.daysOverdue} days overdue
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Ageing", bill.ageingBucket],
                      ["Bill amount", formatAmount(bill.billAmount)],
                      ["Received", formatAmount(bill.received)],
                      ["Credit", `${bill.creditDays} days`]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border bg-muted/25 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 rounded-md border bg-slate-50/80 p-3 md:grid-cols-[1fr_1fr]">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Latest note</p>
                      <p className="mt-1 text-sm">{latest?.remarks || bill.remarks || "Follow-up pending"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Contact</p>
                      <p className="mt-1 text-sm font-medium">{maskPhone(bill.phone)}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{bill.email}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border bg-white p-3 shadow-sm">
                  {canEdit ? (
                    <form action={sendPaymentWhatsappReminder}>
                      <input type="hidden" name="bill_key" value={bill.billKey} />
                      <input type="hidden" name="party_name" value={bill.partyName} />
                      <input type="hidden" name="company" value={bill.company} />
                      <input type="hidden" name="bill_no" value={bill.billNo} />
                      <input type="hidden" name="phone" value={bill.phone} />
                      <input type="hidden" name="contact_person" value={bill.contactPerson} />
                      <input type="hidden" name="outstanding" value={bill.outstanding} />
                      <input type="hidden" name="due_date" value={bill.dueDate} />
                      <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Send WATI Reminder
                      </button>
                    </form>
                  ) : null}
                  <Link
                    href={whatsappLink(bill)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold text-primary hover:bg-muted"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Open Manual WhatsApp
                  </Link>
                  {canEdit ? (
                    <form action={createPaymentFollowup} className="mt-3 grid gap-2">
                      <input type="hidden" name="bill_key" value={bill.billKey} />
                      <input type="hidden" name="party_name" value={bill.partyName} />
                      <input type="hidden" name="company" value={bill.company} />
                      <input type="hidden" name="bill_no" value={bill.billNo} />
                      <div className="grid grid-cols-2 gap-2">
                        <select name="status" className="h-10 rounded-md border bg-white px-2 text-sm">
                          {["Pending", "Called", "WhatsApp Sent", "Promise to Pay", "Dispute", "Paid", "Escalated"].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <select name="mode" className="h-10 rounded-md border bg-white px-2 text-sm">
                          {["Phone Call", "WhatsApp", "Email", "Visit"].map((mode) => (
                            <option key={mode} value={mode}>{mode}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                          Promise date
                          <input name="promised_pay_date" type="date" className="h-10 rounded-md border bg-white px-2 text-sm text-foreground" />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                          Promise amount
                          <input name="promised_amount" type="number" placeholder="Amount" className="h-10 rounded-md border bg-white px-2 text-sm text-foreground" />
                        </label>
                      </div>
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Next follow-up
                        <input name="next_followup_date" type="date" className="h-10 rounded-md border bg-white px-2 text-sm text-foreground" />
                      </label>
                      <input name="remarks" placeholder="Remark, commitment, dispute or escalation note" className="h-10 rounded-md border bg-white px-3 text-sm" />
                      <button className="h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                        Save Follow-up
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Latest Follow-up History</h2>
            <p className="mt-1 text-sm text-muted-foreground">Secure Supabase log for internal payment actions.</p>
          </div>
          <div className="divide-y">
            {followups.logs.slice(0, 8).map((log) => (
              <div key={log.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{log.party_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{log.remarks || "-"}</p>
                </div>
                <div className="text-left md:text-right">
                  <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${statusTone(log.status)}`}>
                    {log.status}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{log.followup_date}</p>
                </div>
              </div>
            ))}
            {!followups.logs.length ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                No secure follow-up logs yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Security Model</h2>
            <p className="mt-1 text-sm text-muted-foreground">Payment follow-up data remains access controlled.</p>
          </div>
          <div className="space-y-3 p-4 text-sm">
            {[
              ["Outstanding source", "Controlled import feed"],
              ["Follow-up history", "Supabase protected table"],
              ["Access", "Accounts/Billing permission"],
              ["Phone privacy", "Numbers masked on screen"]
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 rounded-md border bg-muted/25 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="mt-1 text-muted-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
