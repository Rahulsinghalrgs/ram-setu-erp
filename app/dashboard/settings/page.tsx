import { AttendancePanel } from "@/components/attendance-panel";
import { CommunicationCenter } from "@/components/communication-center";
import { EmployeeDirectory } from "@/components/employee-directory";
import { TeamLoginForm } from "@/components/erp-forms";
import { RecordTable } from "@/components/record-table";
import { permissionLabel } from "@/lib/access-control";
import { getAppContext, getEmployeeDirectoryData, getModuleData } from "@/lib/erp-queries";
import { redirect } from "next/navigation";

type SettingsPageProps = {
  searchParams?: Promise<{
    system?: string;
    department?: string;
    status?: string;
    access?: string;
    q?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const access = await getAppContext();
  if (!access.isAdmin) {
    redirect("/dashboard");
  }
  const params = await searchParams;

  if (params?.system === "attendance-leave") {
    return <AttendancePanel />;
  }

  if (params?.system === "communication-center") {
    return <CommunicationCenter context={access} />;
  }

  if (params?.system === "employee-lifecycle") {
    const employeeData = await getEmployeeDirectoryData({
      department: params.department,
      status: params.status,
      access: params.access,
      q: params.q
    });
    return (
      <EmployeeDirectory
        employees={employeeData.employees}
        allEmployees={employeeData.allEmployees}
        filters={employeeData.filters}
        error={employeeData.error}
      />
    );
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
        : "No modules",
    member.created_at ? new Date(member.created_at).toLocaleDateString("en-IN") : "Active"
  ]);

  return (
    <div className="space-y-4">
      <TeamLoginForm />
      <RecordTable
        title="Company Settings"
        description="Team access, company defaults, and organization members."
        columns={["Area", "Default", "Status", "Owner"]}
        rows={[
          ["Company", data.organization.name, "Active", "Owner"],
          ["Currency", "INR", "Active", "Admin"],
          ["Tax model", "India GST", "Active", "Finance"],
          ["Members", data.members.length, "Live", "Owner"]
        ]}
      />
      <RecordTable
        title="Doer Access"
        description="Active Richa users who can sign in and work inside Ram Setu ERP."
        columns={["Name", "Role", "Allowed portions", "Added"]}
        rows={memberRows.length ? memberRows : [["No team members yet", "-", "-", "-"]]}
      />
    </div>
  );
}
