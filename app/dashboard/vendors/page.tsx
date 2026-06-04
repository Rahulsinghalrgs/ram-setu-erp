import { SupplierForm } from "@/components/erp-forms";
import { RecordTable } from "@/components/record-table";
import { canAccessModule, getModuleData, requireModuleAccess } from "@/lib/erp-queries";

export default async function VendorsPage() {
  await requireModuleAccess("vendors");
  const data = await getModuleData();

  return (
    <div className="space-y-4">
      {canAccessModule(data.access, "vendors", "edit") ? <SupplierForm /> : null}
      <RecordTable
        title="Suppliers"
        description="Import and supply partner master connected to Supabase."
        columns={["Supplier", "GSTIN", "State", "Phone", "Email"]}
        rows={data.vendors.map((vendor) => [
          vendor.name,
          vendor.gstin || "-",
          vendor.state_code || "-",
          vendor.phone || "-",
          vendor.email || "-"
        ])}
      />
    </div>
  );
}
