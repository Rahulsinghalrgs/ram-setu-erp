import { redirect } from "next/navigation";
import { TeamLoginBulkImportForm, TeamLoginForm } from "@/components/erp-forms";
import { RecordTable } from "@/components/record-table";
import { permissionLabel } from "@/lib/access-control";
import { getAppContext, getModuleData } from "@/lib/erp-queries";

export default async function UsersPage() {
  const access = await getAppContext();
  if (!access.isAdmin) {
    redirect("/dashboard");
  }

  const data = await getModuleData();
  const memberRows = data.members.map((member) => [
    member.profiles?.full_name || "Team member",
    member.role,
    member.organization_member_permissions?.length
      ? member.organization_member_permissions
          .map((permission: any) => `${permissionLabel(permission.module_key)}: ${permission.can_edit ? "Edit" : "View"}`)
          .join(", ")
      : ["owner", "admin"].includes(member.role)
        ? "Full access"
        : "Tasks only (Delegation / Checklist)",
    member.created_at ? new Date(member.created_at).toLocaleDateString("en-IN") : "Active"
  ]);

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="bg-[linear-gradient(110deg,#081f49,#0f4f8a_58%,#08798f)] bg-[length:180%_180%] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Access Control</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Users &amp; Team</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50">
            Naye logins banayein, role aur module access set karein, ya CSV se bulk users add karein. Staff users sirf
            apne Delegation aur Checklist tasks dekhte hain.
          </p>
        </div>
      </section>

      <section className="rounded-md border bg-white/95 p-4 shadow-sm">
        <div className="mb-4 border-b pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Add User Login</p>
          <h2 className="text-xl font-semibold">Create a single login</h2>
          <p className="text-sm text-muted-foreground">Doer ka naam, email, temporary password, role aur module access set karein.</p>
        </div>
        <TeamLoginForm />
      </section>

      <TeamLoginBulkImportForm />

      <div id="members">
        <RecordTable
          title="Team Members"
          description="Active Richa users who can sign in and work inside Ram Setu ERP."
          columns={["Name", "Role", "Allowed portions", "Added"]}
          rows={memberRows.length ? memberRows : [["No team members yet", "-", "-", "-"]]}
        />
      </div>
    </div>
  );
}
