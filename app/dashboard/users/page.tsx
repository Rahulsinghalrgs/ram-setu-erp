import { redirect } from "next/navigation";
import { TeamLoginBulkImportForm, TeamLoginForm } from "@/components/erp-forms";
import { MemberTable } from "@/components/member-table";
import { getAppContext, getUsersPageData } from "@/lib/erp-queries";

export default async function UsersPage() {
  const access = await getAppContext();
  if (!access.isAdmin) {
    redirect("/dashboard");
  }

  const data = await getUsersPageData();

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <div className="bg-[linear-gradient(110deg,#081f49,#0f4f8a_58%,#08798f)] bg-[length:180%_180%] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Access Control</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Users &amp; Team</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50">
            Create new logins, set roles and module access, or bulk add users via CSV. Staff users only see their own
            Delegation and Checklist tasks.
          </p>
        </div>
      </section>

      <section className="rounded-md border bg-white/95 p-4 shadow-sm">
        <div className="mb-4 border-b pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Add User Login</p>
          <h2 className="text-xl font-semibold">Create a single login</h2>
          <p className="text-sm text-muted-foreground">
            Set the employee name, email, temporary password, role, and module access.
          </p>
        </div>
        <TeamLoginForm />
      </section>

      <TeamLoginBulkImportForm />

      <div id="members">
        <MemberTable members={data.members} />
      </div>
    </div>
  );
}
