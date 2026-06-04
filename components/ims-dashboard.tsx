import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Factory,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  ShieldCheck,
  Store,
  Truck,
  Warehouse
} from "lucide-react";
import {
  getImsData,
  getImsSummary
} from "@/lib/ims";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function movementTone(type: string) {
  return type.toLowerCase().includes("out")
    ? "bg-rose-50 text-rose-700"
    : "bg-emerald-50 text-emerald-700";
}

export async function ImsDashboard() {
  const ims = await getImsData();
  const summary = getImsSummary(ims.stockItems, ims.movements);
  const stockRows = ims.stockItems
    .slice()
    .sort((a, b) => b.totalStock - a.totalStock)
    .slice(0, 14);
  const movementRows = ims.movements.slice(0, 10);

  const metrics = [
    { label: "SKU master", value: summary.skuCount, note: "Active stock items", icon: Boxes },
    { label: "Total stock", value: formatNumber(summary.totalStock), note: "All locations", icon: Warehouse },
    { label: "Today IN", value: formatNumber(summary.todayIn), note: "Received today", icon: PackagePlus },
    { label: "Today OUT", value: formatNumber(summary.todayOut), note: "Issued today", icon: PackageMinus },
    { label: "In transit", value: formatNumber(summary.inTransit), note: "Open transit stock", icon: Truck },
    { label: "Movements", value: summary.movementRows, note: "Latest IN/OUT rows", icon: PackageCheck }
  ];

  const locationCards = [
    { label: "Godown 1", value: summary.godown1, icon: Warehouse },
    { label: "Godown 2", value: summary.godown2, icon: Warehouse },
    { label: "Shop", value: summary.shop, icon: Store },
    { label: "China Godown", value: summary.chinaGodown, icon: Factory }
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                Stock & Inventory
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">IMS Control Dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/82">
                Live stock master, stock IN/OUT, godown balances, transit stock, and latest movement visibility inside Ram Setu ERP.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map((metric) => {
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

        {ims.error && (
          <div className="mx-4 mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">IMS source access required</p>
                <p className="mt-1 leading-5">{ims.error}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Live Stock Master</h2>
            <p className="mt-1 text-sm text-muted-foreground">Top stock rows from IMS STOCK_DATA.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Item Code", "Item Name", "Godown 1", "Godown 2", "Shop", "China", "Today IN", "Today OUT", "Total"].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {stockRows.length ? (
                  stockRows.map((item) => (
                    <tr key={`${item.itemCode}-${item.itemName}`}>
                      <td className="px-4 py-3 font-medium">{item.itemCode}</td>
                      <td className="max-w-[320px] px-4 py-3">
                        <span className="block truncate">{item.itemName}</span>
                      </td>
                      <td className="px-4 py-3">{formatNumber(item.godown1)}</td>
                      <td className="px-4 py-3">{formatNumber(item.godown2)}</td>
                      <td className="px-4 py-3">{formatNumber(item.shop)}</td>
                      <td className="px-4 py-3">{formatNumber(item.chinaGodown)}</td>
                      <td className="px-4 py-3">{formatNumber(item.todayIn)}</td>
                      <td className="px-4 py-3">{formatNumber(item.todayOut)}</td>
                      <td className="px-4 py-3 font-semibold">{formatNumber(item.totalStock)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={9}>
                      No IMS stock rows loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border bg-white/95 shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-xl font-semibold">Location Stock</h2>
              <p className="mt-1 text-sm text-muted-foreground">Stock split by store location.</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {locationCards.map((location) => {
                const Icon = location.icon;
                return (
                  <div key={location.label} className="rounded-md border bg-muted/25 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{location.label}</p>
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-xl font-semibold">{formatNumber(location.value)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border bg-white/95 shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-xl font-semibold">System Health</h2>
              <p className="mt-1 text-sm text-muted-foreground">IMS setup status.</p>
            </div>
            <div className="space-y-3 p-4">
              {[
                ["IMS Form", "Ready", "HTML form is linked."],
                ["STOCK_DATA", ims.stockItems.length ? "Ready" : "Pending", `${ims.stockItems.length} stock rows loaded.`],
                ["STOCK INOUT", ims.movements.length ? "Ready" : "Pending", `${ims.movements.length} movement rows loaded.`]
              ].map(([label, status, detail]) => (
                <div key={label} className="flex gap-3 rounded-md border bg-muted/25 p-3">
                  {status === "Ready" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{label}</p>
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border bg-white/95 shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-xl font-semibold">Stock IN/OUT Register</h2>
          <p className="mt-1 text-sm text-muted-foreground">Latest stock movement rows from IMS STOCK INOUT.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
              <tr>
                {["Date", "Type", "SKU", "Item", "Qty", "Challan", "Party", "Godown", "Remarks"].map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {movementRows.map((movement) => (
                <tr key={`${movement.date}-${movement.sku}-${movement.qty}`}>
                  <td className="px-4 py-3">{movement.date}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${movementTone(movement.type)}`}>
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{movement.sku}</td>
                  <td className="max-w-[300px] px-4 py-3">
                    <span className="block truncate">{movement.item}</span>
                  </td>
                  <td className="px-4 py-3">{formatNumber(movement.qty)}</td>
                  <td className="px-4 py-3">{movement.challan}</td>
                  <td className="px-4 py-3">{movement.party}</td>
                  <td className="px-4 py-3">{movement.godown}</td>
                  <td className="px-4 py-3 text-muted-foreground">{movement.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">IMS Control</h2>
              <p className="text-sm text-muted-foreground">SKU stock, location balances and movement entries stay in one review screen.</p>
            </div>
          </div>
        </div>
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Stock Visibility</h2>
              <p className="text-sm text-muted-foreground">Godown, shop, China godown, transit and latest IN/OUT records are boss-review ready.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
