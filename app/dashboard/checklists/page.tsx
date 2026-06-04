import { redirect } from "next/navigation";
import { ChecklistCenter } from "@/components/checklist-center";
import type { PermissionModuleKey } from "@/lib/access-control";
import { canAccessModule, getChecklistData, requireModuleAccess } from "@/lib/erp-queries";

type ChecklistsPageProps = {
  searchParams?: Promise<{ department?: string }>;
};

const departmentModules: Record<string, PermissionModuleKey> = {
  dashboard: "reports",
  sales: "sales",
  purchases: "purchases",
  inventory: "inventory",
  accounts: "invoices",
  hr: "reports"
};

function normalizeDepartment(value?: string) {
  return value && departmentModules[value] ? value : "dashboard";
}

export default async function ChecklistsPage({ searchParams }: ChecklistsPageProps) {
  const params = await searchParams;
  const departmentKey = normalizeDepartment(params?.department);
  const context = await requireModuleAccess(departmentModules[departmentKey]);
  const data = await getChecklistData(departmentKey);

  if (!canAccessModule(context, departmentModules[departmentKey])) {
    redirect("/dashboard");
  }

  return <ChecklistCenter checklists={data.checklists} departmentKey={departmentKey} employees={data.employees} />;
}
