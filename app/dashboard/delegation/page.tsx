import { redirect } from "next/navigation";
import { DelegationCenter } from "@/components/delegation-center";
import { canAccessModule, getDelegationData, requireModuleAccess } from "@/lib/erp-queries";

export default async function DelegationPage() {
  const context = await requireModuleAccess("reports");
  const data = await getDelegationData();

  if (!canAccessModule(context, "reports")) {
    redirect("/dashboard");
  }

  return <DelegationCenter delegations={data.delegations} />;
}
