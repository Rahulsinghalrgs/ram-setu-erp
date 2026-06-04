import { InventoryBulkImportForm, InventoryForm, ProductForm, WarehouseForm } from "@/components/erp-forms";
import type { Option } from "@/components/erp-forms";
import { ImsDashboard } from "@/components/ims-dashboard";
import { RecordTable } from "@/components/record-table";
import { canAccessModule, getModuleData, requireModuleAccess } from "@/lib/erp-queries";

type InventoryPageProps = {
  searchParams?: Promise<{ system?: string }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  await requireModuleAccess("inventory");
  const params = await searchParams;

  if (params?.system === "ims-control") {
    return <ImsDashboard />;
  }

  const data = await getModuleData();
  const movementSign = (type: string) => (type === "sale_issue" ? -1 : 1);
  const productBalances = new Map<
    string,
    {
      sku: string;
      name: string;
      total: number;
      godowns: Map<string, number>;
    }
  >();
  const godownTotals = new Map<string, number>();

  for (const movement of data.movements) {
    const productId = movement.product_id;
    const godownName = movement.warehouses?.name || "Unassigned";
    const quantity = Number(movement.quantity || 0) * movementSign(movement.movement_type);
    const existing =
      productBalances.get(productId) ||
      {
        sku: movement.products?.sku || "-",
        name: movement.products?.name || "Product",
        total: 0,
        godowns: new Map<string, number>()
      };

    existing.total += quantity;
    existing.godowns.set(godownName, (existing.godowns.get(godownName) || 0) + quantity);
    productBalances.set(productId, existing);
    godownTotals.set(godownName, (godownTotals.get(godownName) || 0) + quantity);
  }

  const stockRows = Array.from(productBalances.values()).sort((a, b) => b.total - a.total);
  const totalStock = stockRows.reduce((sum, item) => sum + item.total, 0);
  const activeSkus = stockRows.length;
  const activeGodowns = godownTotals.size;
  const lowStock = stockRows.filter((item) => {
    const product = data.products.find((productRow) => productRow.sku === item.sku);
    return Number(product?.reorder_level || 0) > 0 && item.total <= Number(product?.reorder_level || 0);
  }).length;
  const latestMovements = data.movements.slice(0, 12);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
            Inventory & Operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Inventory Management System</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/85">
            Multiple godown stock, SKU master, stock IN/OUT, manual movement and bulk upload in one operational view.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-4">
          {[
            ["Total stock", totalStock.toLocaleString("en-IN"), "All godowns combined"],
            ["Active SKUs", activeSkus, "Products with movement"],
            ["Godowns", activeGodowns, "Locations with stock"],
            ["Low stock", lowStock, "At or below reorder level"]
          ].map(([label, value, note]) => (
            <div key={label as string} className="rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">{label as string}</p>
              <p className="mt-3 text-2xl font-semibold">{String(value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note as string}</p>
            </div>
          ))}
        </div>
      </section>

      {canAccessModule(data.access, "inventory", "edit") ? (
        <>
          <InventoryBulkImportForm />
          <div className="grid gap-4 xl:grid-cols-2">
            <WarehouseForm />
            {canAccessModule(data.access, "products", "edit") ? <ProductForm /> : null}
          </div>
          <InventoryForm products={data.products as Option[]} warehouses={data.warehouses as Option[]} />
        </>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <RecordTable
          title="Consolidated Stock Register"
          description="Same SKU ka total stock all godowns se sum hokar yahan dikhta hai."
          columns={["SKU", "Product", "Total Stock", "Godown Breakup"]}
          rows={stockRows.map((item) => [
            item.sku,
            item.name,
            item.total.toLocaleString("en-IN"),
            Array.from(item.godowns.entries())
              .map(([godown, qty]) => `${godown}: ${qty.toLocaleString("en-IN")}`)
              .join(" | ")
          ])}
        />
        <RecordTable
          title="Godown Summary"
          description="Location-wise total available stock."
          columns={["Godown", "Stock"]}
          rows={Array.from(godownTotals.entries()).map(([godown, quantity]) => [
            godown,
            quantity.toLocaleString("en-IN")
          ])}
        />
      </section>

      <RecordTable
        title="Inventory Movements"
        description="Live stock receipts, sale issues, transfers and adjustments."
        columns={["Product", "Warehouse", "Type", "Quantity", "Notes"]}
        rows={latestMovements.map((movement) => [
          movement.products?.name || "-",
          movement.warehouses?.name || "-",
          movement.movement_type,
          Number(movement.quantity).toLocaleString("en-IN"),
          movement.notes || "-"
        ])}
      />
    </div>
  );
}
