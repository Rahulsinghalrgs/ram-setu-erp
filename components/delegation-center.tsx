import { CalendarClock, Download, ListTodo, ShieldAlert, UserCheck } from "lucide-react";
import {
  TaskDelegationBulkImportForm,
  TaskDelegationForm,
  TaskDelegationUpdateForm,
  checklistDepartmentOptions
} from "@/components/erp-forms";

type DelegationRow = Record<string, any>;

const departmentLabels = checklistDepartmentOptions.reduce<Record<string, string>>((labels, department) => {
  labels[department.id] = department.name;
  return labels;
}, {});

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildReportHref(rows: DelegationRow[]) {
  const headers = [
    "department",
    "delegation_code",
    "title",
    "assigned_to",
    "assigned_by",
    "priority",
    "planned_date",
    "target_date",
    "revised_date",
    "completed_date",
    "status",
    "proof_url",
    "remarks"
  ];
  const body = rows.map((row) =>
    headers
      .map((header) =>
        csvValue(header === "department" ? departmentLabels[row.department_key] || row.department_key : row[header])
      )
      .join(",")
  );
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${headers.join(",")}\n${body.join("\n")}\n`)}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function statusTone(status: string) {
  if (status === "done") return "bg-emerald-50 text-emerald-700";
  if (status === "blocked") return "bg-rose-50 text-rose-700";
  if (status === "in_progress") return "bg-blue-50 text-blue-700";
  if (status === "not_required") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function priorityTone(priority: string) {
  if (priority === "critical") return "bg-rose-50 text-rose-700";
  if (priority === "high") return "bg-orange-50 text-orange-700";
  if (priority === "low") return "bg-slate-100 text-slate-600";
  return "bg-blue-50 text-blue-700";
}

export function DelegationCenter({ delegations }: { delegations: DelegationRow[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const pending = delegations.filter((row) => row.status !== "done" && row.status !== "not_required");
  const overdue = pending.filter((row) => {
    const due = row.revised_date || row.target_date;
    return due && due < today;
  });
  const blocked = delegations.filter((row) => row.status === "blocked");
  const reportHref = buildReportHref(delegations);

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="grid gap-5 bg-[linear-gradient(110deg,#081f49,#0f4f8a_58%,#08798f)] bg-[length:180%_180%] p-6 text-white lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Company Control System</p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Task Delegation Center</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50 md:text-base">
              Kisi bhi employee ko one-time task assign karein. Doer, planned date, deadline, revised date,
              proof aur status ek jagah track hoga.
            </p>
          </div>
          <a
            href={reportHref}
            download="ram-setu-delegation-report.csv"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-blue-50"
          >
            <Download className="h-4 w-4" />
            Download Report
          </a>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total tasks", value: delegations.length, note: "All delegations", icon: ListTodo },
            { label: "Pending action", value: pending.length, note: "Open tasks", icon: UserCheck },
            { label: "Overdue", value: overdue.length, note: "Past deadline", icon: CalendarClock },
            { label: "Blocked", value: blocked.length, note: "Escalation required", icon: ShieldAlert }
          ].map((metric) => (
            <div key={metric.label} className="rounded-md border bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-muted-foreground">{metric.label}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <metric.icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold">{metric.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{metric.note}</p>
            </div>
          ))}
        </div>
      </section>

      <TaskDelegationForm departmentKey="dashboard" />

      <TaskDelegationBulkImportForm departmentKey="dashboard" />

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">Delegation Register</h2>
          <p className="text-sm text-muted-foreground">
            Assigned tasks, doer, deadline aur latest update.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Doer</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Report / Update</th>
              </tr>
            </thead>
            <tbody>
              {delegations.length ? (
                delegations.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-4 py-4 font-semibold">{row.delegation_code || "-"}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{row.title}</p>
                      <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                        {row.description || row.remarks || "No description added"}
                      </p>
                    </td>
                    <td className="px-4 py-4">{row.assigned_to || "-"}</td>
                    <td className="px-4 py-4">{departmentLabels[row.department_key] || row.department_key}</td>
                    <td className="px-4 py-4">{formatDate(row.revised_date || row.target_date)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${priorityTone(row.priority)}`}>
                        {row.priority || "medium"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusTone(row.status)}`}>
                        {String(row.status || "pending").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {row.proof_url ? (
                        <a href={row.proof_url} target="_blank" rel="noreferrer" className="mb-2 inline-flex text-sm font-semibold text-primary">
                          Open proof
                        </a>
                      ) : null}
                      <TaskDelegationUpdateForm delegation={row} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Abhi koi delegation nahi hai. Upar form se task assign karein.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
