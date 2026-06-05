"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTeamMemberLogin, createTeamLoginLink, bulkImportTeamLogins } from "@/lib/erp-actions";
import { permissionModules } from "@/lib/access-control";

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  minLength
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function Btn({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  const { pending: formPending } = useFormStatus();
  const isPending = pending || formPending;
  return (
    <button
      type="submit"
      disabled={isPending}
      className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
    >
      {isPending ? "Saving…" : children}
    </button>
  );
}

export function TeamLoginForm() {
  const [state, action, pending] = useActionState(createTeamMemberLogin, null);

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-3">
        <Field name="employee_code" label="Employee code" placeholder="EMP-001" />
        <Field name="full_name" label="Name" placeholder="Employee name" required />
        <Field name="phone" label="Number" placeholder="9876543210" />
        <Field name="email" label="Email" type="email" placeholder="employee@company.com" required />
        <Field name="department" label="Department" placeholder="Sales / Accounts / Operations" />
        <Field name="designation" label="Designation" placeholder="Sales Executive" />
        <Field
          name="password"
          label="Password"
          type="password"
          placeholder="Minimum 8 characters"
          required
          minLength={8}
        />
        <label className="block text-sm">
          <span className="font-medium">Role</span>
          <select name="role" defaultValue="staff" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="staff">Staff (tasks only)</option>
            <option value="manager">Manager (tasks only)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </label>
        <div className="flex flex-col gap-2 md:col-span-3">
          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}
          {state !== null && !state.error && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Login created successfully.</p>
          )}
          <Btn pending={pending}>Create user login</Btn>
        </div>
      </form>

      <form
        action={createTeamLoginLink}
        className="grid gap-3 rounded-md border bg-white/95 p-4 shadow-sm md:grid-cols-[1fr_auto]"
      >
        <Field name="email" label="Magic link fallback" type="email" placeholder="employee@company.com" required />
        <div className="flex items-end">
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Send backup link
          </button>
        </div>
      </form>
    </div>
  );
}

export function TeamLoginBulkImportForm() {
  const [state, action, pending] = useActionState(bulkImportTeamLogins, null);

  const sampleHeaders = "employee_code,full_name,phone,email,department,designation,password,role";
  const sampleRows = [
    "EMP001,Aman Pareek,9876543210,aman@company.com,Sales,Sales Executive,Welcome@123,staff",
    "EMP002,Riya Sharma,9876500011,riya@company.com,Accounts,Accountant,Welcome@123,staff",
    "EMP003,Vikas Mehra,9811122233,vikas@company.com,Operations,Ops Manager,Welcome@123,manager"
  ];
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    `${sampleHeaders}\n${sampleRows.join("\n")}\n`
  )}`;
  const sampleRow = sampleRows[0];

  return (
    <section id="bulk" className="rounded-md border bg-white/95 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bulk Add Users</p>
          <h2 className="text-xl font-semibold">Upload user CSV</h2>
          <p className="text-sm text-muted-foreground">
            Create multiple logins at once. If the email already exists, the password will be reset. Password must be
            8+ characters.
          </p>
        </div>
        <a
          href={templateHref}
          download="ram-setu-users-template.csv"
          className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Download CSV template
        </a>
      </div>

      <form action={action} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">CSV file</span>
            <input
              name="user_csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paste CSV data</span>
            <textarea
              name="user_csv_text"
              className="mt-1 min-h-32 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder={`${sampleHeaders}\n${sampleRow}`}
            />
          </label>

          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}
          {state?.message && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "Importing…" : "Bulk create logins"}
          </button>
        </div>

        <div className="rounded-md border bg-slate-50/80 p-3">
          <p className="text-sm font-semibold">Required columns</p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">{sampleHeaders}</pre>
          </div>
          <p className="mt-3 text-sm font-semibold">Optional module access columns</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            After the role column, add one column per module (value: <code>view</code> or <code>edit</code>). Staff
            without module access will only see their own Delegation/Checklist tasks.
          </p>
          <div className="mt-2 overflow-x-auto rounded-md border bg-white p-3">
            <pre className="text-xs leading-5 text-slate-700">
              {permissionModules.map((m) => m.key).join(", ")}
            </pre>
          </div>
        </div>
      </form>
    </section>
  );
}
