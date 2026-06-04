import {
  BellRing,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  ShieldCheck,
  Upload,
  Wand2,
  type LucideIcon
} from "lucide-react";
import {
  bulkImportWorkflowReminders,
  createWorkflowReminder,
  sendTestWatiTemplate,
  updateWorkflowReminder
} from "@/lib/communication-actions";
import { getCommunicationLogs, getWatiDiagnostics, getWorkflowReminders, isWatiConfigured, watiApiEndpoint } from "@/lib/communication";
import type { AppContext } from "@/lib/erp-queries";

type CommunicationCenterProps = {
  context: AppContext;
};

function statusTone(status: string) {
  if (status === "sent") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildReminderReportHref(reminders: Awaited<ReturnType<typeof getWorkflowReminders>>["reminders"]) {
  const headers = [
    "workflow",
    "reference_key",
    "client_name",
    "contact_person",
    "phone",
    "email",
    "channel",
    "template_name",
    "due_date",
    "priority",
    "status",
    "owner_name",
    "remarks"
  ];
  const body = reminders.map((row) => headers.map((header) => csvValue((row as any)[header])).join(","));
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${headers.join(",")}\n${body.join("\n")}\n`)}`;
}

const channelCards: Array<{ label: string; status: string | number; note: string; icon: LucideIcon }> = [
  { label: "WhatsApp", status: "Pending", note: "WATI template messages", icon: MessageCircle },
  { label: "Email", status: "Planned", note: "SMTP/Resend reminder channel", icon: Mail },
  { label: "Reminders", status: 0, note: "0 due today/overdue", icon: BellRing },
  { label: "Security", status: "Active", note: "Server-side token and logs", icon: ShieldCheck }
];

function hasBusinessAccountLock(log: Awaited<ReturnType<typeof getCommunicationLogs>>["logs"][number]) {
  const text = `${log.error_message || ""} ${JSON.stringify(log.provider_response || {})}`.toLowerCase();
  return text.includes("business account locked") || text.includes("business account is locked");
}

const watiTemplatePack = [
  {
    name: "payment_followup_reminder",
    workflow: "Payment follow-up",
    variables: "contact_person | party_name | bill_no | outstanding_amount | due_date",
    body:
      "Hello {{contact_person}}, this is a payment reminder from Richa Global Sales for {{party_name}}. Bill: {{bill_no}}. Outstanding: {{outstanding_amount}}. Due date: {{due_date}}. Please confirm the expected payment date. Thank you."
  },
  {
    name: "order_received_confirmation",
    workflow: "Order received",
    variables: "contact_person | party_name | order_no | item_name | quantity",
    body:
      "Hello {{contact_person}}, your order has been received by Richa Global Sales. Order: {{order_no}}. Party: {{party_name}}. Item: {{item_name}}. Quantity: {{quantity}}. Our team will update you once stock and dispatch are confirmed."
  },
  {
    name: "order_dispatch_update",
    workflow: "Dispatch update",
    variables: "contact_person | party_name | order_no | dispatch_date | transport_detail",
    body:
      "Hello {{contact_person}}, your order dispatch has been updated by Richa Global Sales. Order: {{order_no}}. Party: {{party_name}}. Dispatch date: {{dispatch_date}}. Transport or vehicle: {{transport_detail}}. Please keep the receiving team ready."
  },
  {
    name: "order_delivery_feedback",
    workflow: "Delivery feedback",
    variables: "contact_person | party_name | order_no | delivery_date",
    body:
      "Hello {{contact_person}}, Richa Global Sales has marked your order as delivered. Order: {{order_no}}. Party: {{party_name}}. Delivery date: {{delivery_date}}. Please confirm receipt and share feedback if any support is required."
  },
  {
    name: "product_requirement_followup",
    workflow: "Product requirement",
    variables: "contact_person | party_name | product_name | quantity",
    body:
      "Hello {{contact_person}}, this is a product requirement follow-up from Richa Global Sales. Party: {{party_name}}. Product: {{product_name}}. Required quantity: {{quantity}}. Please confirm requirement status or share any change needed."
  },
  {
    name: "general_business_followup",
    workflow: "General follow-up",
    variables: "contact_person | party_name | reference_no | followup_purpose",
    body:
      "Hello {{contact_person}}, this is a follow-up from Richa Global Sales. Reference: {{reference_no}}. Party: {{party_name}}. Purpose: {{followup_purpose}}. Please share the latest update when convenient. Thank you."
  }
];

export async function CommunicationCenter({ context }: CommunicationCenterProps) {
  const configured = isWatiConfigured();
  const watiDiagnostics = getWatiDiagnostics();
  const [{ logs, error }, { reminders, error: reminderError }] = await Promise.all([
    getCommunicationLogs(context.organization.id),
    getWorkflowReminders(context.organization.id)
  ]);
  const canEdit = context.isAdmin || Boolean(context.permissions.reports?.canEdit);
  const today = new Date().toISOString().slice(0, 10);
  const dueReminders = reminders.filter((reminder) => reminder.status === "scheduled" && reminder.due_date <= today);
  const activeReminders = reminders.filter((reminder) => !["done", "cancelled"].includes(reminder.status));
  const lockedWatiLogs = logs.filter(hasBusinessAccountLock);
  const reminderReportHref = buildReminderReportHref(reminders);
  const sampleHeaders =
    "workflow,reference_key,client_name,contact_person,phone,email,channel,template_name,due_date,priority,status,owner_name,remarks";
  const sampleRow =
    "payment_followup,INV-2026-001,ABC Traders Pvt Ltd,Mr. Rajesh Kumar,9876543210,accounts@abctraders.in,whatsapp,payment_followup_reminder,2026-05-05,high,scheduled,Rahul,Promise pending";
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`${sampleHeaders}\n${sampleRow}\n`)}`;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                Admin Automation
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Communication Center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/82">
                WATI WhatsApp, email reminders, workflow templates and message logs for Ram Setu ERP follow-ups.
              </p>
            </div>
            <div className="rounded-md border border-white/25 bg-white/10 px-4 py-3 text-sm">
              <p className="font-semibold">{configured ? "WATI connected" : "WATI setup pending"}</p>
              <p className="mt-1 text-cyan-50/72">
                {configured ? watiApiEndpoint : "Add WATI_API_ENDPOINT and WATI_ACCESS_TOKEN in server env."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-4">
          {channelCards
            .map((card) =>
              card.label === "WhatsApp"
                ? { ...card, status: configured ? "Connected" : "Pending" }
                : card.label === "Reminders"
                  ? { ...card, status: activeReminders.length, note: `${dueReminders.length} due today/overdue` }
                  : card
            )
            .map(({ label, status, note, icon: Icon }) => (
            <div key={label} className="rounded-md border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-xl font-semibold">{status}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
      </section>

      {lockedWatiLogs.length ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-red-700">WATI delivery blocked</p>
              <h2 className="mt-1 text-xl font-semibold">Meta/WATI business account locked</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6">
                API message IDs create ho rahe hain, lekin final delivery Meta restriction ki wajah se fail ho rahi hai. Resend karne se delivery fix nahi hogi; pehle Meta Business Support Home me WABA/account restriction review karna hoga.
              </p>
            </div>
            <a
              href="https://business.facebook.com/business-support-home/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
            >
              Open Support Home
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-3 text-xs font-medium text-red-800">
            Latest locked attempts: {lockedWatiLogs.slice(0, 3).map((log) => log.provider_message_id || log.reference_key || log.recipient_contact).join(", ")}
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Universal Reminder Engine</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payment, order received, dispatch, delivery, product requirement, checklist aur internal follow-up ek queue me.
                </p>
              </div>
              <a
                href={reminderReportHref}
                download="ram-setu-reminder-report.csv"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download Report
              </a>
            </div>
          </div>
          <form action={createWorkflowReminder} className="grid gap-3 p-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Workflow</span>
              <select name="workflow" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
                <option value="payment_followup">Payment follow-up</option>
                <option value="order_received">Order received</option>
                <option value="order_dispatch">Order dispatch</option>
                <option value="order_delivered">Order delivered</option>
                <option value="product_requirement">Product requirement</option>
                <option value="checklist_followup">Checklist follow-up</option>
                <option value="general_follow_up">General follow-up</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Reference</span>
              <input name="reference_key" placeholder="INV / Order / Checklist code" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Client / party</span>
              <input name="client_name" required placeholder="ABC Traders Pvt Ltd" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Contact person</span>
              <input name="contact_person" placeholder="Mr. Rajesh Kumar" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">WhatsApp / phone</span>
              <input name="phone" placeholder="9876543210" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Email</span>
              <input name="email" type="email" placeholder="accounts@client.com" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Channel</span>
              <select name="channel" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="call">Phone call</option>
                <option value="internal">Internal task</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Template</span>
              <input name="template_name" placeholder="payment_followup_reminder" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Due date</span>
              <input name="due_date" type="date" required className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Priority</span>
              <select name="priority" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Owner</span>
              <input name="owner_name" placeholder="Responsible person" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Subject</span>
              <input name="subject" placeholder="Reminder subject" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium">Message preview / remarks</span>
              <textarea name="message_preview" placeholder="Reminder message or internal note" className="mt-1 min-h-20 w-full rounded-md border px-3 py-2" />
            </label>
            <div className="md:col-span-2">
              <button
                disabled={!canEdit}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Add Reminder
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Bulk Reminder Upload</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Client master, payment sheet, order sheet ya checklist export se reminders bulk me create karo.
                </p>
              </div>
              <a
                href={templateHref}
                download="ram-setu-reminder-template.csv"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                CSV Template
              </a>
            </div>
          </div>
          <form action={bulkImportWorkflowReminders} className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium">CSV file</span>
                <input
                  name="reminder_csv"
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Paste CSV data</span>
                <textarea
                  name="reminder_csv_text"
                  placeholder={`${sampleHeaders}\n${sampleRow}`}
                  className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs"
                />
              </label>
              <button
                disabled={!canEdit}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Bulk Create Reminders
              </button>
            </div>
            <div className="rounded-md border bg-slate-50/80 p-3">
              <p className="text-sm font-semibold">Supported headers</p>
              <pre className="mt-2 overflow-x-auto rounded-md border bg-white p-3 text-xs leading-5 text-slate-700">
                {sampleHeaders}
              </pre>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Party, Company, Customer, Mobile, WhatsApp, Invoice, Bill No, Order No, Followup Date jaise common headers bhi auto-map honge.
              </p>
            </div>
          </form>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">WATI Template Pack</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ye approved Utility templates ERP ke payment, order, dispatch, delivery aur requirement reminders me use honge.
              </p>
            </div>
            <a
              href="https://live.wati.io/10141888/messageTemplate"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
            >
              Open WATI Templates
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {watiTemplatePack.map((template) => (
            <div key={template.name} className="rounded-md border bg-slate-50/80 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{template.workflow}</p>
                  <p className="mt-1 font-mono text-xs text-primary">{template.name}</p>
                </div>
                <span className="rounded-sm bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                  Utility
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Variables
              </p>
              <p className="mt-1 font-mono text-xs text-slate-700">{template.variables}</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{template.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-xl font-semibold">Reminder Queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Due reminders, owner aur channel ek operational queue me. Report download available hai.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status / Update</th>
              </tr>
            </thead>
            <tbody>
              {reminders.length ? (
                reminders.slice(0, 40).map((reminder) => (
                  <tr key={reminder.id} className="border-t align-top">
                    <td className="px-4 py-4 font-semibold">{reminder.due_date}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold capitalize">{reminder.workflow.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{reminder.reference_key || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{reminder.client_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{reminder.owner_name || "No owner"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{reminder.contact_person || "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{reminder.phone || reminder.email || "-"}</p>
                    </td>
                    <td className="px-4 py-4 capitalize">{reminder.channel}</td>
                    <td className="px-4 py-4 capitalize">{reminder.priority}</td>
                    <td className="px-4 py-4">
                      <form action={updateWorkflowReminder} className="grid gap-2">
                        <input type="hidden" name="id" value={reminder.id} />
                        <div className="grid grid-cols-3 gap-2">
                          <select name="status" defaultValue={reminder.status} className="h-9 rounded-md border bg-white px-2">
                            <option value="scheduled">Scheduled</option>
                            <option value="sent">Sent</option>
                            <option value="done">Done</option>
                            <option value="failed">Failed</option>
                            <option value="paused">Paused</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <select name="priority" defaultValue={reminder.priority} className="h-9 rounded-md border bg-white px-2">
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                            <option value="low">Low</option>
                          </select>
                          <input name="due_date" type="date" defaultValue={reminder.due_date} className="h-9 rounded-md border px-2" />
                        </div>
                        <input name="remarks" defaultValue={reminder.remarks || ""} placeholder="Update note" className="h-9 rounded-md border px-2" />
                        <button disabled={!canEdit} className="h-9 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50">
                          Update
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {reminderError || "No reminders yet. Manual add ya CSV bulk upload se start karo."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">WATI Test Sender</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              WATI approval ke baad real number par test bhejne ke liye. Token browser me expose nahi hota.
            </p>
          </div>
          <div className="border-b bg-amber-50/70 p-4">
            <div className="rounded-md border border-amber-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-950">Payment follow-up template</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Pending WATI approval
                  </p>
                </div>
                <a
                  href="https://live.wati.io/10141888/messageTemplate"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-amber-300 px-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Open WATI
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-1 text-xs leading-5 text-emerald-900">
                <span className="font-semibold">payment_followup_reminder</span> submit ho chuka hai. Approval milte hi Payment Follow-up screen se WhatsApp reminder direct trigger hoga.
              </p>
            </div>
          </div>
          <form action={sendTestWatiTemplate} className="space-y-3 p-4">
            <div className="grid gap-2 rounded-md border bg-slate-50 p-3 text-xs md:grid-cols-2">
              {[
                ["Endpoint", watiDiagnostics.endpointConfigured ? watiDiagnostics.endpointHost : "Missing"],
                ["Token", watiDiagnostics.tokenConfigured ? "Configured" : "Missing"],
                ["Channel", watiDiagnostics.channelNumber || "Default pending"],
                ["Webhook", "Stores callbacks after migration"]
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-semibold text-slate-700">{label}</p>
                  <p className="mt-1 text-muted-foreground">{value}</p>
                </div>
              ))}
            </div>
            <label className="block text-sm font-medium">
              Test WhatsApp Number
              <input name="phone" placeholder="9876543210" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm font-medium">
              WATI Template Name
              <input
                name="template_name"
                defaultValue="payment_followup_reminder"
                className="mt-1 h-10 w-full rounded-md border px-3"
              />
            </label>
            <label className="block text-sm font-medium">
              Template Variables
              <input name="parameters" placeholder="Mr. Rajesh | ABC Traders | INV-001 | Rs 10000 | 05 May" className="mt-1 h-10 w-full rounded-md border px-3" />
            </label>
            <label className="block text-sm font-medium">
              Internal Preview
              <textarea name="preview" placeholder="Payment reminder test message" className="mt-1 min-h-20 w-full rounded-md border px-3 py-2" />
            </label>
            <button
              disabled={!canEdit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Send Test
            </button>
            {!configured ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                WATI token env me add hone ke baad test send active hoga.
              </p>
            ) : null}
          </form>
        </div>

        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Communication Log</h2>
            <p className="mt-1 text-sm text-muted-foreground">WhatsApp/email attempts ka secure audit trail.</p>
          </div>
          <div className="divide-y">
            {logs.slice(0, 12).map((log) => (
              <div key={log.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{log.recipient_name || log.recipient_contact}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.workflow} / {log.template_name || log.subject || "-"}
                  </p>
                  {log.error_message ? <p className="mt-1 text-xs text-rose-700">{log.error_message}</p> : null}
                  {log.provider_message_id ? (
                    <p className="mt-1 text-xs text-muted-foreground">WATI ID: {log.provider_message_id}</p>
                  ) : null}
                </div>
                <div className="text-left md:text-right">
                  <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${statusTone(log.status)}`}>
                    {log.status}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{log.created_at?.slice(0, 10)}</p>
                </div>
              </div>
            ))}
            {!logs.length ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                {error || "No communication logs yet."}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
