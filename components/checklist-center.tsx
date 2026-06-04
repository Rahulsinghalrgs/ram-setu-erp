import { Download, FileCheck2, ListChecks, ShieldCheck, Upload } from "lucide-react";
import {
  DepartmentChecklistBulkImportForm,
  DepartmentChecklistForm,
  DepartmentChecklistUpdateForm,
  checklistDepartmentOptions
} from "@/components/erp-forms";

type ChecklistRow = Record<string, any>;

const departmentLabels = checklistDepartmentOptions.reduce<Record<string, string>>((labels, department) => {
  labels[department.id] = department.name;
  return labels;
}, {});

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildReportHref(rows: ChecklistRow[]) {
  const headers = [
    "department",
    "checklist_code",
    "title",
    "owner_name",
    "frequency",
    "priority",
    "due_date",
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

type EmployeeOption = { name: string; email: string | null; code: string | null };

export function ChecklistCenter({
  checklists,
  departmentKey,
  employees = []
}: {
  checklists: ChecklistRow[];
  departmentKey: string;
  employees?: EmployeeOption[];
}) {
  const departmentRows = checklists.filter((row) => row.department_key === departmentKey);
  const today = new Date().toISOString().slice(0, 10);
  const pending = departmentRows.filter((row) => row.status !== "done" && row.status !== "not_required");
  const dueToday = pending.filter((row) => row.due_date === today);
  const blocked = departmentRows.filter((row) => row.status === "blocked");
  const reportHref = buildReportHref(departmentRows);

  const departmentCards = checklistDepartmentOptions.map((department) => {
    const rows = checklists.filter((row) => row.department_key === department.id);
    return {
      ...department,
      total: rows.length,
      pending: rows.filter((row) => row.status !== "done" && row.status !== "not_required").length
    };
  });

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="grid gap-5 bg-[linear-gradient(110deg,#081f49,#0f4f8a_58%,#08798f)] bg-[length:180%_180%] p-6 text-white lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Company Control System</p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Department Checklist Center</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50 md:text-base">
              Har department ka SOP, daily task, proof, owner aur status ek jagah manage hoga. Manual entry,
              bulk CSV upload aur report download ready hai.
            </p>
          </div>
          <a
            href={reportHref}
            download={`ram-setu-${departmentKey}-checklist-report.csv`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-blue-50"
          >
            <Download className="h-4 w-4" />
            Download Report
          </a>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total checklist", value: departmentRows.length, note: departmentLabels[departmentKey], icon: ListChecks },
            { label: "Pending action", value: pending.length, note: "Open tasks", icon: FileCheck2 },
            { label: "Due today", value: dueToday.length, note: "Needs same-day closure", icon: Upload },
            { label: "Blocked", value: blocked.length, note: "Escalation required", icon: ShieldCheck }
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

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {departmentCards.map((department) => (
          <a
            key={department.id}
            href={`/dashboard/checklists?department=${department.id}`}
            className={`rounded-md border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              department.id === departmentKey
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-white text-foreground"
            }`}
          >
            <p className="text-sm font-semibold">{department.name}</p>
            <p className={`mt-2 text-2xl font-bold ${department.id === departmentKey ? "text-white" : "text-slate-950"}`}>
              {department.total}
            </p>
            <p className={`text-xs ${department.id === departmentKey ? "text-blue-100" : "text-muted-foreground"}`}>
              {department.pending} pending
            </p>
          </a>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <DepartmentChecklistForm departmentKey={departmentKey} employees={employees} />
        <DepartmentChecklistBulkImportForm departmentKey={departmentKey} />
      </div>

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">Checklist Register</h2>
          <p className="text-sm text-muted-foreground">
            {departmentLabels[departmentKey]} ke active checkpoints, owner, due date aur latest update.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Checklist</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Report / Update</th>
              </tr>
            </thead>
            <tbody>
              {departmentRows.length ? (
                departmentRows.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-4 py-4 font-semibold">{row.checklist_code || "-"}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{row.title}</p>
                      <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                        {row.description || row.remarks || "No description added"}
                      </p>
                    </td>
                    <td className="px-4 py-4">{row.owner_name || "-"}</td>
                    <td className="px-4 py-4 capitalize">{String(row.frequency || "-").replace("_", " ")}</td>
                    <td className="px-4 py-4">{formatDate(row.due_date)}</td>
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
                      <DepartmentChecklistUpdateForm checklist={row} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Abhi checklist blank hai. Manual add karein ya CSV bulk upload se shuru karein.
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
