import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Download,
  FileCheck2,
  KeyRound,
  type LucideIcon,
  ShieldCheck,
  UserCheck,
  UsersRound
} from "lucide-react";
import { EmployeeBulkImportForm, EmployeeRecordForm, TeamLoginForm } from "@/components/erp-forms";

type EmployeeRecord = Record<string, any>;

type EmployeeDirectoryProps = {
  employees: EmployeeRecord[];
  allEmployees?: EmployeeRecord[];
  filters?: {
    department?: string;
    status?: string;
    access?: string;
    q?: string;
  };
  error?: string | null;
};

function csvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function employeeReportHref(employees: EmployeeRecord[]) {
  const headers = [
    "employee_code",
    "full_name",
    "department",
    "designation",
    "role",
    "status",
    "app_access_status",
    "login_email",
    "phone",
    "whatsapp",
    "joining_date",
    "reporting_manager",
    "employment_type",
    "document_folder_url",
    "remarks"
  ];
  const body = employees.map((employee) => headers.map((header) => csvValue(employee[header])).join(","));
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${headers.join(",")}\n${body.join("\n")}\n`)}`;
}

function maskPhone(value: unknown) {
  const text = String(value || "");
  const digits = text.replace(/\D/g, "");
  if (digits.length < 4) return text || "-";
  const prefix = text.startsWith("+") ? "+91 " : "";
  return `${prefix}${digits.slice(-4).padStart(10, "x")}`;
}

function maskEmail(value: unknown) {
  const text = String(value || "");
  if (!text.includes("@")) return text || "-";
  const [name, domain] = text.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function statusTone(status: string) {
  if (["active", "invited"].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["blocked", "disabled", "left"].includes(status)) return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function titleCase(value: unknown, fallback = "-") {
  const text = String(value || "").replaceAll("_", " ").trim();
  return text ? text.replace(/\b\w/g, (char) => char.toUpperCase()) : fallback;
}

function initials(name: unknown) {
  return String(name || "Employee")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function filterHref(next: Partial<NonNullable<EmployeeDirectoryProps["filters"]>>) {
  const params = new URLSearchParams({ system: "employee-lifecycle" });
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  return `/dashboard/settings?${params.toString()}`;
}

function uniqueValues(employees: EmployeeRecord[], key: string) {
  return Array.from(new Set(employees.map((employee) => employee[key]).filter(Boolean))).sort();
}

export function EmployeeDirectory({ employees, allEmployees = employees, filters = {}, error }: EmployeeDirectoryProps) {
  const total = allEmployees.length;
  const visibleTotal = employees.length;
  const active = allEmployees.filter((employee) => employee.status === "active").length;
  const withAccess = allEmployees.filter((employee) => employee.app_access_status === "active").length;
  const pendingCredentials = allEmployees.filter(
    (employee) => !employee.auth_user_id && !["disabled", "blocked"].includes(employee.app_access_status)
  ).length;
  const departments = uniqueValues(allEmployees, "department");
  const missingContact = allEmployees.filter((employee) => !employee.phone && !employee.whatsapp && !employee.login_email).length;
  const missingDocuments = allEmployees.filter((employee) => !employee.document_folder_url).length;
  const managers = uniqueValues(allEmployees, "reporting_manager").length;
  const reportHref = employeeReportHref(employees);
  const activeFilters = Boolean(filters.department || filters.status || filters.access || filters.q);
  const departmentBreakdown = departments
    .map((department) => ({
      department,
      count: allEmployees.filter((employee) => employee.department === department).length,
      active: allEmployees.filter((employee) => employee.department === department && employee.status === "active").length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const credentialQueue = allEmployees
    .filter((employee) => !employee.auth_user_id || employee.app_access_status !== "active")
    .slice(0, 6);
  const dataQualityScore = total ? Math.max(0, Math.round(((total * 2 - missingContact - missingDocuments) / (total * 2)) * 100)) : 0;
  const metrics: Array<{ label: string; value: string | number; note: string; icon: LucideIcon }> = [
    { label: "Employees", value: total, note: "Master rows", icon: UsersRound },
    { label: "Active", value: active, note: "Currently working", icon: UserCheck },
    { label: "Departments", value: departments.length, note: "Mapped teams", icon: Building2 },
    { label: "Managers", value: managers, note: "Reporting lines", icon: BadgeCheck },
    { label: "ERP access", value: withAccess, note: "Linked login", icon: KeyRound },
    { label: "Pending login", value: pendingCredentials, note: "Need invite/login", icon: AlertTriangle },
    { label: "Data health", value: `${dataQualityScore}%`, note: "Contact + document", icon: FileCheck2 }
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/85">HR Command Center</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Employee Master & Credentials</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-cyan-50/90">
                Central employee profile, department ownership, contact hygiene, document readiness and ERP login control in one secure master.
              </p>
              <div className="mt-4 grid max-w-4xl gap-2 sm:grid-cols-3">
                {[
                  ["Source", "HR master", "Single source for ERP"],
                  ["Credential rule", "No password storage", "Supabase Auth handles login"],
                  ["Bulk ready", "CSV update", "Employee code based upsert"]
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-md border border-white/20 bg-white/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100/80">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-cyan-50/75">{note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-white/25 bg-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Security</p>
                  <p className="text-lg font-semibold">Access controlled</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-blue-50">
                Admin ke alawa employee list visible nahi rahegi. Phone/email register me masked hai, export sirf admin action se hota hai.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7">
          {metrics.map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="rounded-md border bg-slate-50/80 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Employee master table abhi database me deploy/migrate nahi hua hai. Migration run hote hi data live dikhega.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Smart Filters</p>
              <h2 className="text-xl font-semibold">Employee control view</h2>
              <p className="text-sm text-muted-foreground">
                {visibleTotal} of {total} employees visible. Filter data before export or credential action.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={filterHref({})} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold hover:bg-muted">
                Clear
              </Link>
              <a
                href={reportHref}
                download="ram-setu-employee-master-report.csv"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Export
              </a>
            </div>
          </div>
          <form className="mt-4 grid gap-3 lg:grid-cols-4" action="/dashboard/settings">
            <input type="hidden" name="system" value="employee-lifecycle" />
            <label className="block text-sm">
              <span className="font-medium">Search</span>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Name, code, email, manager"
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Department</span>
              <select name="department" defaultValue={filters.department} className="mt-1 h-10 w-full rounded-md border bg-white px-3">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Employee status</span>
              <select name="status" defaultValue={filters.status} className="mt-1 h-10 w-full rounded-md border bg-white px-3">
                <option value="">All status</option>
                {uniqueValues(allEmployees, "status").map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">App access</span>
              <select name="access" defaultValue={filters.access} className="mt-1 h-10 w-full rounded-md border bg-white px-3">
                <option value="">All access</option>
                {uniqueValues(allEmployees, "app_access_status").map((access) => (
                  <option key={access} value={access}>
                    {titleCase(access)}
                  </option>
                ))}
              </select>
            </label>
            <div className="lg:col-span-4">
              <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Apply filters
              </button>
              {activeFilters ? <span className="ml-3 text-sm text-muted-foreground">Filtered view active</span> : null}
            </div>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-md border bg-white/95 p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Department strength</h2>
            <div className="mt-3 space-y-3">
              {departmentBreakdown.length ? (
                departmentBreakdown.map((item) => (
                  <div key={item.department}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{item.department}</span>
                      <span className="text-muted-foreground">{item.active}/{item.count} active</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.count / Math.max(total, 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Department data add hote hi yahan strength dikhegi.</p>
              )}
            </div>
          </div>
          <div className="rounded-md border bg-white/95 p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Credential queue</h2>
            <div className="mt-3 space-y-2">
              {credentialQueue.length ? (
                credentialQueue.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{employee.full_name}</p>
                      <p className="text-xs text-muted-foreground">{employee.employee_code} · {employee.department || "General"}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusTone(employee.app_access_status)}`}>
                      {titleCase(employee.app_access_status || "not_created")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">All visible employees have active ERP login.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <EmployeeRecordForm />
        <EmployeeBulkImportForm />
      </section>

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Central Employee Register</h2>
            <p className="text-sm text-muted-foreground">
              HR, attendance, checklist, field staff, reminders and ERP access ke liye single employee source.
            </p>
          </div>
          <a
            href={reportHref}
            download="ram-setu-employee-master-report.csv"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Download report
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Credential</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Joining</th>
                <th className="px-4 py-3">Manager</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.length ? (
                employees.map((employee) => (
                  <tr key={employee.id} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                          {initials(employee.full_name)}
                        </div>
                        <div>
                          <p className="font-semibold">{employee.full_name}</p>
                          <p className="text-xs text-muted-foreground">{employee.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{employee.department || "General"}</p>
                      <p className="text-xs text-muted-foreground">{employee.designation || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="capitalize">{titleCase(employee.role)}</p>
                      <p className="text-xs text-muted-foreground">{titleCase(employee.status)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{maskPhone(employee.whatsapp || employee.phone)}</p>
                      <p className="text-xs text-muted-foreground">{maskEmail(employee.login_email)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusTone(employee.app_access_status)}`}>
                        {titleCase(employee.app_access_status || "not_created")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {employee.document_folder_url ? (
                        <a href={employee.document_folder_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                          Drive folder
                        </a>
                      ) : (
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">{employee.joining_date || "-"}</td>
                    <td className="px-4 py-4">{employee.reporting_manager || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                    Employee master blank hai ya current filter me data nahi hai. Manual add karein ya CSV bulk upload se start karein.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border bg-white/95 p-4 shadow-sm">
        <div className="mb-4 border-b pb-3">
          <h2 className="text-xl font-semibold">Create ERP Login</h2>
          <p className="text-sm text-muted-foreground">
            Verified employee ke liye login create karo. Is step ke baad employee credential status automatically active ho jayega.
          </p>
        </div>
        <TeamLoginForm />
      </section>
    </div>
  );
}
