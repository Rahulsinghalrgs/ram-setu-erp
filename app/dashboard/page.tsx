import {
  ArrowUpRight,
  Boxes,
  ClipboardCheck,
  Factory,
  FileText,
  Gauge,
  IndianRupee,
  PackageCheck,
  ShieldCheck,
  Truck
} from "lucide-react";
import Image from "next/image";
import { businessMix, companyHighlights, pipelineStages, qualityChecks } from "@/lib/erp-data";
import { getDashboardData } from "@/lib/erp-queries";
import { currencyFormatter } from "@/lib/utils";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const kpiIcons = [IndianRupee, FileText, Boxes, ShieldCheck];
  const kpis = [
    {
      label: data.kpis[0].label,
      value: currencyFormatter.format(data.kpis[0].value),
      note: data.kpis[0].note
    },
    {
      label: data.kpis[1].label,
      value: currencyFormatter.format(data.kpis[1].value),
      note: data.kpis[1].note
    },
    {
      label: data.kpis[2].label,
      value: `${data.kpis[2].value.toLocaleString("en-IN")}`,
      note: data.kpis[2].note
    },
    {
      label: data.kpis[3].label,
      value: `${data.kpis[3].value}`,
      note: data.kpis[3].note
    }
  ];
  const controlCards = [
    { label: "Dispatch", value: "Wazirpur ready", icon: Truck },
    { label: "QC", value: "98% pass", icon: ClipboardCheck },
    { label: "Control", value: "Admin locked", icon: ShieldCheck },
    { label: "Velocity", value: "Live data", icon: Gauge }
  ];

  return (
    <div className="space-y-5">
      <section className="brand-panel overflow-hidden rounded-md p-5 text-white shadow-xl shadow-blue-950/20">
        <div className="grid gap-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-semibold uppercase text-white/85">
              <Factory className="h-3.5 w-3.5" aria-hidden="true" />
              Ram Setu ERP Command Center
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal xl:text-5xl">
              {data.organization.name}
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-white/86">
              Live command room for connector pins, CCTV components, premium wires, GST billing,
              stock visibility, and Wazirpur dispatch decisions.
            </p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              {[
                ["Live order book", "Sales"],
                ["GST-ready invoices", "Finance"],
                ["Fast dispatch view", "Ops"]
              ].map(([item, tag]) => (
                <div key={item} className="rounded-md border border-white/22 bg-white/14 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="font-semibold">{item}</p>
                  <p className="mt-1 text-xs text-white/70">{tag}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 rounded-md border border-white/20 bg-white/12 p-4 shadow-2xl shadow-slate-950/15 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-white/65">Today&apos;s Control</p>
                <p className="mt-1 text-lg font-semibold">Boss review snapshot</p>
              </div>
              <div className="rounded-md bg-white p-2">
                <Image
                  src="/brand/richa-group-logo.jpeg"
                  alt="Richa Group"
                  width={120}
                  height={52}
                  className="h-9 w-24 object-contain"
                  priority
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {controlCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-md border border-white/16 bg-white/10 p-3">
                  <Icon className="h-4 w-4 text-cyan-100" aria-hidden="true" />
                  <p className="mt-3 text-xs text-white/62">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => {
          const Icon = kpiIcons[index];
          return (
            <div
              key={kpi.label}
              className="metric-card surface-panel rounded-md p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white shadow-md shadow-blue-900/15">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-950">{kpi.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{kpi.note}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="surface-panel rounded-md">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">Priority order board</h2>
              <p className="text-sm text-muted-foreground">Sales, invoice and dispatch records from Supabase</p>
            </div>
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Order", "Buyer", "Status", "Date", "Value"].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.salesOrders.slice(0, 6).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-primary">{order.order_number}</td>
                    <td className="px-4 py-4">{order.customers?.name || "Buyer"}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{order.order_date}</td>
                    <td className="px-4 py-4 font-semibold">{currencyFormatter.format(Number(order.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface-panel rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Order pipeline</h2>
              <p className="text-sm text-muted-foreground">Inquiry to dispatch</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-3">
            {pipelineStages.map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-muted-foreground">{stage.amount}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${stage.value * 5}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="surface-panel rounded-md p-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Inventory health</h2>
            <Boxes className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-4">
            {data.movements.slice(0, 5).map((movement) => (
              <div key={movement.id} className="rounded-md bg-background p-3 ring-1 ring-border/70">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{movement.products?.name || "Stock movement"}</p>
                    <p className="text-sm text-muted-foreground">{movement.products?.sku || movement.movement_type}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-medium">{Number(movement.quantity).toLocaleString("en-IN")} units</p>
                    <p className="text-muted-foreground">{movement.movement_type}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-secondary" style={{ width: "78%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">QC snapshot</h2>
              <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {qualityChecks.map((check) => (
                <div key={check.label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{check.label}</p>
                    <p className="text-muted-foreground">{check.result}</p>
                  </div>
                  <span className="font-semibold text-primary">{check.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Business mix</h2>
              <PackageCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {businessMix.map((item) => (
                <div key={item.label} className="rounded-md bg-background p-3 ring-1 ring-border/70">
                  <p className="text-lg font-semibold text-primary">{item.value}</p>
                  <p className="mt-1 text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-md p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Management focus</h2>
            <p className="text-sm text-muted-foreground">
              Designed for boss review: what is selling, what is ready, what is stuck, and what needs dispatch.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {companyHighlights.map((item) => (
              <span key={item} className="rounded-md bg-primary/10 px-3 py-2 font-medium text-primary">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
