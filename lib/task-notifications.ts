import { createAdminClient } from "@/lib/supabase/admin";
import { isWatiConfigured, sendWatiTemplateMessage } from "@/lib/communication";

// WATI template names (must be approved in your WATI account). Override via env.
const ASSIGN_TEMPLATE = process.env.WATI_TASK_ASSIGN_TEMPLATE || "task_assignment";
const PENDING_TEMPLATE = process.env.WATI_TASK_PENDING_TEMPLATE || "task_pending_reminder";

type AnyRecord = Record<string, any>;

function isOpenStatus(status: unknown) {
  const value = String(status || "pending");
  return value !== "done" && value !== "not_required";
}

function formatDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "No deadline";
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

// WhatsApp template params cannot contain newlines/tabs or 4+ spaces.
function sanitizeParam(value: string) {
  return value.replace(/[\n\r\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

async function findEmployeePhone(db: any, organizationId: string, nameOrEmail: string | null) {
  if (!nameOrEmail) return null;
  const isEmail = nameOrEmail.includes("@");
  const { data } = await db
    .from("employee_directory")
    .select("full_name, phone, whatsapp")
    .eq("organization_id", organizationId)
    .eq(isEmail ? "login_email" : "full_name", nameOrEmail)
    .limit(1)
    .maybeSingle();
  const phone = data?.whatsapp || data?.phone || null;
  return phone ? { name: data?.full_name || nameOrEmail, phone: String(phone) } : null;
}

async function logTaskMessage(
  db: any,
  organizationId: string,
  workflow: string,
  contact: { name: string; phone: string },
  preview: string,
  result: Awaited<ReturnType<typeof sendWatiTemplateMessage>>,
  templateName: string
) {
  try {
    await db.from("communication_logs").insert({
      organization_id: organizationId,
      channel: "whatsapp",
      provider: "wati",
      workflow,
      recipient_name: contact.name,
      recipient_contact: contact.phone,
      template_name: templateName,
      message_preview: preview.slice(0, 480),
      status: result.ok ? "sent" : "failed",
      provider_message_id: result.ok ? result.providerMessageId : null,
      error_message: result.ok ? null : result.error || "WATI send failed.",
      provider_response: result.providerResponse || result.result || null,
      sent_at: result.ok ? new Date().toISOString() : null
    });
  } catch {
    // Logging is best-effort; never block task flow on it.
  }
}

// Fire a WhatsApp message to the assigned employee the moment a task is created.
// Best-effort: never throws, so task creation is not blocked if WATI fails.
export async function notifyTaskAssignment(args: {
  db: any;
  organizationId: string;
  assignedTo: string | null;
  title: string;
  dueDate?: string | null;
  assignedBy?: string | null;
  kind: "delegation" | "checklist";
}) {
  try {
    if (!isWatiConfigured()) return;
    const contact = await findEmployeePhone(args.db, args.organizationId, args.assignedTo);
    if (!contact) return;

    const label = args.kind === "delegation" ? "Delegation" : "Checklist";
    const parameters = [
      sanitizeParam(contact.name),
      sanitizeParam(`${label}: ${args.title}`),
      sanitizeParam(formatDate(args.dueDate)),
      sanitizeParam(args.assignedBy || "Admin")
    ];

    const result = await sendWatiTemplateMessage({
      phone: contact.phone,
      templateName: ASSIGN_TEMPLATE,
      contactName: contact.name,
      parameters
    });

    await logTaskMessage(
      args.db,
      args.organizationId,
      "task_assignment",
      contact,
      `${label} "${args.title}" assigned to ${contact.name}`,
      result,
      ASSIGN_TEMPLATE
    );
  } catch {
    // Best-effort notification.
  }
}

// Daily reminder: one consolidated WhatsApp per person listing their pending
// delegation + checklist tasks. Runs across all organizations (cron-triggered).
export async function sendPendingTaskReminders() {
  if (!isWatiConfigured()) {
    return { ok: false, reason: "wati-not-configured", sent: 0, recipients: 0 };
  }

  const admin = createAdminClient() as any;

  const [{ data: delegationRows }, { data: checklistRows }, { data: employeeRows }] = await Promise.all([
    admin.from("task_delegations").select("organization_id, assigned_to, title, status, target_date, revised_date"),
    admin.from("department_checklists").select("organization_id, owner_name, title, status, due_date"),
    admin.from("employee_directory").select("organization_id, full_name, phone, whatsapp")
  ]);

  // Phone lookup: org + lowercased name -> phone
  const phoneByPerson = new Map<string, { name: string; phone: string }>();
  for (const employee of (employeeRows || []) as AnyRecord[]) {
    const phone = employee.whatsapp || employee.phone;
    if (employee.full_name && phone) {
      phoneByPerson.set(`${employee.organization_id}::${String(employee.full_name).toLowerCase()}`, {
        name: String(employee.full_name),
        phone: String(phone)
      });
    }
  }

  // Group pending tasks per person.
  const tasksByPerson = new Map<string, { organizationId: string; name: string; titles: string[] }>();
  const addTask = (organizationId: string, person: unknown, title: string) => {
    const name = String(person || "").trim();
    if (!name || !title) return;
    const key = `${organizationId}::${name.toLowerCase()}`;
    const entry = tasksByPerson.get(key) || { organizationId, name, titles: [] };
    entry.titles.push(title);
    tasksByPerson.set(key, entry);
  };

  for (const row of (delegationRows || []) as AnyRecord[]) {
    if (isOpenStatus(row.status)) addTask(row.organization_id, row.assigned_to, String(row.title || "Task"));
  }
  for (const row of (checklistRows || []) as AnyRecord[]) {
    if (isOpenStatus(row.status)) addTask(row.organization_id, row.owner_name, String(row.title || "Checklist"));
  }

  let sent = 0;
  let failed = 0;
  let recipients = 0;

  for (const [key, entry] of tasksByPerson) {
    const contact = phoneByPerson.get(key);
    if (!contact) continue; // no phone on file
    recipients += 1;

    const total = entry.titles.length;
    const shown = entry.titles.slice(0, 5);
    const more = total - shown.length;
    const listText = shown.join(" | ") + (more > 0 ? ` (+${more} more)` : "");

    const parameters = [
      sanitizeParam(entry.name),
      sanitizeParam(String(total)),
      sanitizeParam(listText)
    ];

    const result = await sendWatiTemplateMessage({
      phone: contact.phone,
      templateName: PENDING_TEMPLATE,
      contactName: entry.name,
      parameters
    });

    if (result.ok) sent += 1;
    else failed += 1;

    await logTaskMessage(
      admin,
      entry.organizationId,
      "task_pending_reminder",
      contact,
      `${total} pending tasks: ${listText}`,
      result,
      PENDING_TEMPLATE
    );
  }

  return { ok: true, recipients, sent, failed };
}
