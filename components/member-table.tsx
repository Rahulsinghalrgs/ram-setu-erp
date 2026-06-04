"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTeamMember } from "@/lib/erp-actions";
import { permissionModules, permissionLabel } from "@/lib/access-control";
import type { MemberRow } from "@/lib/erp-queries";

function EditMemberForm({ member, onClose }: { member: MemberRow; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(updateTeamMember, null);

  useEffect(() => {
    if (state !== null && !state.error) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="user_id" value={member.userId} />

      <label className="block text-sm">
        <span className="font-medium">Name</span>
        <input
          name="full_name"
          defaultValue={member.displayName !== "Team member" ? member.displayName : ""}
          className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input
          value={member.email || ""}
          readOnly
          className="mt-1 h-10 w-full rounded-md border bg-muted/40 px-3 text-muted-foreground"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Role</span>
        <select name="role" defaultValue={member.role} className="mt-1 h-10 w-full rounded-md border bg-white px-3">
          <option value="staff">Staff (tasks only)</option>
          <option value="manager">Manager (tasks only)</option>
          <option value="admin">Admin (full access)</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium">New password</span>
        <span className="ml-1 text-xs text-muted-foreground">(leave blank to keep current)</span>
        <input
          name="password"
          type="password"
          placeholder="Min 8 characters"
          className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Module access</p>
        <div className="grid grid-cols-2 gap-2">
          {permissionModules.map((module) => (
            <div key={module.key} className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-xs font-semibold">{module.label}</p>
              <div className="mt-1 flex gap-4">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    name={`permission_${module.key}_view`}
                    defaultChecked={member.permissions[module.key]?.canView || false}
                    className="h-3 w-3 accent-blue-700"
                  />
                  View
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    name={`permission_${module.key}_edit`}
                    defaultChecked={member.permissions[module.key]?.canEdit || false}
                    className="h-3 w-3 accent-blue-700"
                  />
                  Edit
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function permissionSummary(member: MemberRow): string {
  if (["owner", "admin"].includes(member.role)) return "Full access";
  const entries = Object.entries(member.permissions).filter(([, p]) => p.canView || p.canEdit);
  if (!entries.length) return "Tasks only";
  return entries
    .map(([key, p]) => `${permissionLabel(key)}: ${p.canEdit ? "Edit" : "View"}`)
    .join(", ");
}

export function MemberTable({ members }: { members: MemberRow[] }) {
  const [editing, setEditing] = useState<MemberRow | null>(null);

  return (
    <section className="surface-panel overflow-hidden rounded-md">
      <div className="border-b bg-white px-4 py-3">
        <h1 className="text-xl font-semibold">Team Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active users who can sign in to Ram Setu ERP.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Module access</th>
              <th className="px-4 py-3 font-semibold">Added</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.length ? (
              members.map((member) => (
                <tr key={member.userId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium">{member.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{member.email || "—"}</td>
                  <td className="px-4 py-3 capitalize">{member.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">{permissionSummary(member)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditing(member)}
                      className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No team members yet. Create the first login using the form above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
          <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Edit user</h2>
                <p className="text-sm text-muted-foreground">{editing.email || editing.displayName}</p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <EditMemberForm key={editing.userId} member={editing} onClose={() => setEditing(null)} />
          </div>
        </div>
      )}
    </section>
  );
}
