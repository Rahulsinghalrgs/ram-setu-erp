"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, ListTodo, UserCircle2 } from "lucide-react";
import { completeMyChecklist, completeMyDelegation } from "@/lib/erp-actions";

type TaskRow = Record<string, any>;

export type MyProfile = {
  fullName: string | null;
  email: string | null;
  employeeCode: string | null;
  role: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  whatsapp: string | null;
  reportingManager: string | null;
  joiningDate: string | null;
  employmentType: string | null;
  status: string | null;
  organizationName: string | null;
};

type MyTasksCenterProps = {
  name: string;
  profile: MyProfile;
  delegations: TaskRow[];
  checklists: TaskRow[];
};

type TabKey = "delegation" | "checklist" | "profile";
type TaskKind = "delegation" | "checklist";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function isOpen(status: string) {
  return status !== "done" && status !== "not_required";
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

function statusOptions() {
  return [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In progress" },
    { value: "done", label: "Done" },
    { value: "blocked", label: "Blocked" }
  ];
}

function TaskCard({
  task,
  kind
}: {
  task: TaskRow;
  kind: TaskKind;
}) {
  const action = kind === "delegation" ? completeMyDelegation : completeMyChecklist;
  const idField = kind === "delegation" ? "delegation_id" : "checklist_id";
  const due = kind === "delegation" ? task.revised_date || task.target_date : task.due_date;
  const code = kind === "delegation" ? task.delegation_code : task.checklist_code;
  const status = String(task.status || "pending");

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {code ? <span className="text-xs font-semibold text-muted-foreground">{code}</span> : null}
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${priorityTone(task.priority)}`}>
              {task.priority || "medium"}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${statusTone(status)}`}>
              {status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">{task.title}</p>
          {task.description || task.remarks ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {task.description || task.remarks}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
          {formatDate(due)}
        </div>
      </div>

      <form action={action} className="mt-4 grid gap-2 border-t pt-3 sm:grid-cols-[150px_1fr_auto] sm:items-center">
        <input type="hidden" name={idField} value={task.id} />
        <select
          name="status"
          defaultValue={isOpen(status) ? status : "done"}
          className="h-9 rounded-md border bg-white px-2 text-sm font-medium"
        >
          {statusOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          name="remarks"
          defaultValue={task.remarks || ""}
          placeholder="Add a remark / report (optional)"
          className="h-9 rounded-md border bg-white px-3 text-sm"
        />
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Save
        </button>
        <input
          name="proof_url"
          defaultValue={task.proof_url || ""}
          placeholder="Proof / document link (optional)"
          className="h-9 rounded-md border bg-white px-3 text-sm sm:col-span-3"
        />
      </form>
    </div>
  );
}

function TaskList({ tasks, kind, emptyLabel }: { tasks: TaskRow[]; kind: TaskKind; emptyLabel: string }) {
  const open = tasks.filter((task) => isOpen(String(task.status || "pending")));
  const closed = tasks.filter((task) => !isOpen(String(task.status || "pending")));

  if (!tasks.length) {
    return (
      <div className="rounded-md border border-dashed bg-white p-10 text-center text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {open.map((task) => (
        <TaskCard key={task.id} task={task} kind={kind} />
      ))}
      {closed.length ? (
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Completed ({closed.length})
          </p>
          {closed.map((task) => (
            <TaskCard key={task.id} task={task} kind={kind} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfilePanel({ profile }: { profile: MyProfile }) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Full name", value: profile.fullName },
    { label: "Login email", value: profile.email },
    { label: "Employee code", value: profile.employeeCode },
    { label: "Role", value: profile.role },
    { label: "Department", value: profile.department },
    { label: "Designation", value: profile.designation },
    { label: "Mobile", value: profile.phone },
    { label: "WhatsApp", value: profile.whatsapp },
    { label: "Reporting manager", value: profile.reportingManager },
    { label: "Joining date", value: profile.joiningDate ? formatDate(profile.joiningDate) : null },
    { label: "Employment type", value: profile.employmentType ? profile.employmentType.replace("_", " ") : null },
    { label: "Status", value: profile.status }
  ];

  const initials = (profile.fullName || profile.email || "U")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="overflow-hidden rounded-md border bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b bg-slate-50/80 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{profile.fullName || "Team member"}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.email || "No login email"}</p>
          {profile.organizationName ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{profile.organizationName}</p>
          ) : null}
        </div>
      </div>
      <dl className="grid gap-px bg-slate-100 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</dt>
            <dd className="mt-1 text-sm font-medium capitalize text-slate-900">{row.value || "-"}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t p-4 text-xs leading-5 text-muted-foreground">
        Profile details update karwana ho to apne admin / HR se sampark karein.
      </p>
    </section>
  );
}

export function MyTasksCenter({ name, profile, delegations, checklists }: MyTasksCenterProps) {
  const [tab, setTab] = useState<TabKey>("delegation");

  const counts = useMemo(() => {
    const all = [...delegations, ...checklists];
    const pending = all.filter((task) => isOpen(String(task.status || "pending"))).length;
    return {
      total: all.length,
      pending,
      done: all.length - pending,
      delegation: delegations.length,
      checklist: checklists.length
    };
  }, [delegations, checklists]);

  const tabs: { key: TabKey; label: string; count: number | null }[] = [
    { key: "delegation", label: "All Delegation", count: counts.delegation },
    { key: "checklist", label: "Checklist", count: counts.checklist },
    { key: "profile", label: "Profile", count: null }
  ];

  const tabIcon = (key: TabKey) => {
    if (key === "delegation") return <ListTodo className="h-4 w-4" />;
    if (key === "checklist") return <ClipboardList className="h-4 w-4" />;
    return <UserCircle2 className="h-4 w-4" />;
  };

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="grid gap-5 bg-[linear-gradient(110deg,#081f49,#0f4f8a_58%,#08798f)] bg-[length:180%_180%] p-6 text-white lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">My Workspace</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Namaste{name ? `, ${name}` : ""}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50">
              Aapke saare assigned tasks yahan hain. Delegation aur checklist complete karke status update karein.
            </p>
          </div>
          <div className="rounded-md border border-white/20 bg-white/12 px-5 py-4 text-center backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">Total tasks</p>
            <p className="mt-1 text-4xl font-bold">{counts.total}</p>
            <p className="mt-1 text-xs text-blue-50">
              {counts.pending} pending &middot; {counts.done} done
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {[
            { label: "Total tasks", value: counts.total, icon: ListTodo },
            { label: "Pending", value: counts.pending, icon: CalendarClock },
            { label: "Completed", value: counts.done, icon: CheckCircle2 }
          ].map((metric) => (
            <div key={metric.label} className="rounded-md border bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-muted-foreground">{metric.label}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <metric.icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="inline-flex w-full max-w-xl gap-1 rounded-md border bg-white p-1 shadow-sm">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              tab === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tabIcon(item.key)}
            {item.label}
            {item.count !== null ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                  tab === item.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "delegation" ? (
        <TaskList tasks={delegations} kind="delegation" emptyLabel="Abhi aapko koi delegation task assign nahi hua hai." />
      ) : tab === "checklist" ? (
        <TaskList tasks={checklists} kind="checklist" emptyLabel="Abhi aapke liye koi checklist task nahi hai." />
      ) : (
        <ProfilePanel profile={profile} />
      )}
    </div>
  );
}
