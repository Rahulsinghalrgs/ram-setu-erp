import { AlertTriangle, PackageCheck, ShoppingBag, Truck, Users } from "lucide-react";
import { PurchaseBulkImportForm, PurchasePunchForm, type Option } from "@/components/erp-forms";
import { RecordTable } from "@/components/record-table";
import { canAccessModule, getModuleData } from "@/lib/erp-queries";
import { currencyFormatter } from "@/lib/utils";

function buildNextPurchaseNumber(orders: Record<string, any>[]) {
  const highest = orders.reduce((max, order) => {
    const match = String(order.order_number || "").match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);

  return `PO-${highest + 1}`;
}

function statusTone(status: string) {
  const normalized = String(status || "draft").toLowerCase();
  if (normalized === "sent") return "bg-blue-100 text-blue-800";
  if (normalized === "confirmed" || normalized === "paid") return "bg-emerald-100 text-emerald-800";
  if (normalized === "cancelled") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export async function PurchaseFmsDashboard() {
  const data = await getModuleData();
  const purchaseOrders = data.purchaseOrders || [];
  const canEditPurchases = canAccessModule(data.access, "purchases", "edit");
  const totalPurchase = purchaseOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const openOrders = purchaseOrders.filter((order) => !["cancelled", "paid"].includes(String(order.status || "").toLowerCase())).length;
  const uniqueSuppliers = new Set(purchaseOrders.map((order) => order.vendor_id).filter(Boolean)).size;
  const itemRows = purchaseOrders.reduce((sum, order) => sum + (Array.isArray(order.purchase_order_items) ? order.purchase_order_items.length : 0), 0);
  const nextPurchaseNumber = buildNextPurchaseNumber(purchaseOrders);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                Purchase & Imports
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Purchase FMS Command Center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/82">
                Supplier PO, SKU purchase rate, GST value, stock receipt and vendor bill tracking ko centralized Product Master se run karo.
              </p>
            </div>
            <div className="rounded-md border border-white/30 bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-50/75">Master linked</p>
              <p className="mt-1 text-sm font-semibold">SKU / item / purchase rate</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "PO value", value: currencyFormatter.format(totalPurchase), note: `${purchaseOrders.length} purchase orders`, icon: ShoppingBag },
            { label: "Open POs", value: openOrders, note: "Supplier follow-up active", icon: Truck },
            { label: "Suppliers", value: uniqueSuppliers || data.vendors.length, note: "Vendor master linked", icon: Users },
            { label: "SKU lines", value: itemRows, note: "Product master items", icon: PackageCheck },
            { label: "Attention", value: purchaseOrders.length ? 0 : 1, note: purchaseOrders.length ? "Flow is live" : "First PO pending", icon: AlertTriangle }
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-md border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      {canEditPurchases ? (
        <section className="space-y-4">
          <PurchasePunchForm
            vendors={data.vendors as Option[]}
            products={data.products as Option[]}
            isAdmin={data.access.isAdmin}
            nextPurchaseNumber={nextPurchaseNumber}
          />
          <PurchaseBulkImportForm />
        </section>
      ) : (
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Purchase Punch</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aapke role me purchase create permission enabled nahi hai.</p>
        </div>
      )}

      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-xl font-semibold">Live Purchase Register</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            PO number, supplier, SKU line, quantity, purchase rate aur GST total ek board par.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
              <tr>
                {["PO", "Supplier", "SKU / Item", "Qty", "Rate", "Total", "Status", "Date"].map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchaseOrders.length ? (
                purchaseOrders.map((order) => {
                  const firstItem = Array.isArray(order.purchase_order_items) ? order.purchase_order_items[0] : null;
                  const product = firstItem?.products;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-primary">{order.order_number}</td>
                      <td className="px-4 py-3">{order.vendors?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{product?.sku || "-"}</p>
                        <p className="text-xs text-muted-foreground">{product?.name || "Product"}</p>
                      </td>
                      <td className="px-4 py-3">{Number(firstItem?.quantity || 0).toLocaleString("en-IN")} {product?.unit || ""}</td>
                      <td className="px-4 py-3">{currencyFormatter.format(Number(firstItem?.unit_price || 0))}</td>
                      <td className="px-4 py-3 font-semibold">{currencyFormatter.format(Number(order.total || 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-sm px-2 py-1 text-xs font-semibold capitalize ${statusTone(order.status)}`}>
                          {String(order.status || "draft")}
                        </span>
                      </td>
                      <td className="px-4 py-3">{order.order_date || "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                    No purchase orders yet. Manual PO punch ya bulk CSV import se first PO add karo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <RecordTable
        title="Supplier Master"
        description="Purchase FMS ke suppliers yahan se linked hain."
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
