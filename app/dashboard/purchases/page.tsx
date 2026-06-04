import { PurchaseFmsDashboard } from "@/components/purchase-fms-dashboard";
import { requireModuleAccess } from "@/lib/erp-queries";

export default async function PurchasesPage() {
  await requireModuleAccess("purchases");
  return <PurchaseFmsDashboard />;
}
