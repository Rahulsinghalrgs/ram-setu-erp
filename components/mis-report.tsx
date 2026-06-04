import { Download, Gauge, ListChecks, ListTodo } from "lucide-react";
import { checklistDepartmentOptions } from "@/components/erp-forms";

type Row = Record<string, any>;

const departmentLabels = checklistDepartmentOptions.reduce<Record<string, string>>((labels, department) => {
  labels[department.id] = department.name;
  return labels;
}, {});

function pct(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 1000) / 10;
}

function summarise(rows: Row[]) {
  const total = rows.length;
  const done = rows.filter((r) => r.status === "done").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;
  const blocked = rows.filter((r) => r.status === "blocked").length;
  const notRequired = rows.filter((r) => r.status === "not_required").length;
  const actionable = total - notRequired;
  return { total, done, pending, inProgress, blocked, notRequired, completion: pct(done, actionable) };
}

function groupBy(rows: Row[], key: string) {
  const map = new Map<string, Row[]>();
  rows.forEach((row) => {
    const k = row[key] || "-";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  });
  return map;
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsv(rows: Row[]) {
  const headers = ["type", "department", "owner", "title", "status", "due_date"];
  const body = rows.map((row) =>
    headers
      .map((h) => csvValue(h === "department" ? departmentLabels[row.department_key] || row.department_key : row[h]))
      .join(",")
  );
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${headers.join(",")}\n${body.join("\n")}\n`)}`;
}

function Bar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold">{value}%</span>
    </div>
  );
}

export function MisReport({
  combined,
  checklistCount,
  delegationCount
}: {
  combined: Row[];
  checklistCount: number;
  delegationCount: number;
}) {
  const overall = summarise(combined);
  const byDepartment = Array.from(groupBy(combined, "department_key").entries()).map(([key, rows]) => ({
    key,
    label: departmentLabels[key] || key,
    ...summarise(rows)
  }));
  const byOwner = Array.from(groupBy(combined.filter((r) => r.owner), "owner").entries())
    .map(([owner, rows]) => ({ owner, ...summarise(rows) }))
    .sort((a, b) => b.completion - a.completion);
  const csvHref = buildCsv(combined);

  const metrics = [
    { label: "Total tasks", value: overall.total, note: `${checklistCount} checklist + ${delegationCount} delegation`, icon: ListTodo },
    { label: "Completed", value: overall.done, note: "Done & closed", icon: ListChecks },
    { label: "Pending / WIP", value: overall.pending + overall.inProgress, note: "Open tasks", icon: ListTodo },
    { label: "Completion %", value: `${overall.completion}%`, note: "Excl. N/A tasks", icon: Gauge }
  ];

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="grid gap-5 bg-[linear-gradient(110deg,#081f49,#0f4f8a_58%,#08798f)] bg-[length:180%_180%] p-6 text-white lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Management Information</p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">MIS Report</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-50 md:text-base">
              Checklist aur delegation dono ka combined performance - department-wise aur doer-wise completion score.
            </p>
          </div>
          <a
            href={csvHref}
            download="ram-setu-mis-report.csv"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-blue-50"
          >
            <Download className="h-4 w-4" />
            Download MIS CSV
          </a>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
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

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">Department-wise MIS</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Done</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">WIP</th>
                <th className="px-4 py-3">Blocked</th>
                <th className="px-4 py-3">Completion</th>
              </tr>
            </thead>
            <tbody>
              {byDepartment.length ? (
                byDepartment.map((d) => (
                  <tr key={d.key} className="border-t">
                    <td className="px-4 py-3 font-semibold">{d.label}</td>
                    <td className="px-4 py-3">{d.total}</td>
                    <td className="px-4 py-3 text-emerald-700">{d.done}</td>
                    <td className="px-4 py-3 text-amber-700">{d.pending}</td>
                    <td className="px-4 py-3 text-blue-700">{d.inProgress}</td>
                    <td className="px-4 py-3 text-rose-700">{d.blocked}</td>
                    <td className="px-4 py-3"><Bar value={d.completion} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">Doer-wise MIS</h2>
          <p className="text-sm text-muted-foreground">Owner / assigned-to ke hisaab se completion score.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Doer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Done</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Blocked</th>
                <th className="px-4 py-3">Completion</th>
              </tr>
            </thead>
            <tbody>
              {byOwner.length ? (
                byOwner.map((o) => (
                  <tr key={o.owner} className="border-t">
                    <td className="px-4 py-3 font-semibold">{o.owner}</td>
                    <td className="px-4 py-3">{o.total}</td>
                    <td className="px-4 py-3 text-emerald-700">{o.done}</td>
                    <td className="px-4 py-3 text-amber-700">{o.pending}</td>
                    <td className="px-4 py-3 text-rose-700">{o.blocked}</td>
                    <td className="px-4 py-3"><Bar value={o.completion} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Doer naam add karne par yahan score dikhega.
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
