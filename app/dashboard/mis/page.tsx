import { redirect } from "next/navigation";
import { MisReport } from "@/components/mis-report";
import { canAccessModule, getMisReportData, requireModuleAccess } from "@/lib/erp-queries";

export default async function MisPage() {
  const context = await requireModuleAccess("reports");
  const data = await getMisReportData();

  if (!canAccessModule(context, "reports")) {
    redirect("/dashboard");
  }

  return (
    <MisReport
      combined={data.combined}
      checklistCount={data.checklistCount}
      delegationCount={data.delegationCount}
    />
  );
}
