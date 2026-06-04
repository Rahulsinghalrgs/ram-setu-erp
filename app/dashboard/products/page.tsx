import { ProductBulkImportForm, ProductForm } from "@/components/erp-forms";
import { RecordTable } from "@/components/record-table";
import { canAccessModule, getModuleData, requireModuleAccess } from "@/lib/erp-queries";

export default async function ProductsPage() {
  await requireModuleAccess("products");
  const data = await getModuleData();

  return (
    <div className="space-y-4">
      {canAccessModule(data.access, "products", "edit") ? <ProductForm /> : null}
      {canAccessModule(data.access, "products", "edit") ? <ProductBulkImportForm /> : null}
      <RecordTable
        title="Product Catalogue"
        description="Connector pins, CCTV components, charger/DC pins and premium wire SKUs."
        columns={["SKU", "Product", "HSN", "Unit", "GST", "Sales price", "Purchase price", "Reorder"]}
        rows={data.products.map((product) => [
          product.sku,
          product.name,
          product.hsn_sac || "-",
          product.unit,
          `${Number(product.gst_rate)}%`,
          `INR ${Number(product.sales_price).toLocaleString("en-IN")}`,
          `INR ${Number(product.purchase_price).toLocaleString("en-IN")}`,
          Number(product.reorder_level).toLocaleString("en-IN")
        ])}
      />
    </div>
  );
}
