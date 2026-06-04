import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  PackageCheck,
  Route,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCheck,
  Users
} from "lucide-react";
import {
  OrderBulkImportForm,
  OrderFlowUpdateForm,
  OrderPunchForm,
  type Option
} from "@/components/erp-forms";
import { canAccessModule, getModuleData } from "@/lib/erp-queries";
import { getOrderDeliveryFeed } from "@/lib/order-to-delivery";
import { currencyFormatter } from "@/lib/utils";

function countReady(values: string[]) {
  return values.filter((value) => value && value !== "-" && value.toLowerCase() !== "link").length;
}

function statusTone(status: string) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "done") return "bg-emerald-100 text-emerald-800";
  if (normalized === "blocked") return "bg-red-100 text-red-800";
  if (normalized === "in_progress") return "bg-sky-100 text-sky-800";
  if (normalized === "not_required") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-800";
}

function statusLabel(status: string) {
  return String(status || "pending").replace(/_/g, " ");
}

const orderStageKeys = [
  { label: "Payment", key: "payment_check_status" },
  { label: "Stock", key: "stock_status" },
  { label: "Dispatch", key: "dispatch_status" },
  { label: "Billing", key: "billing_status" },
  { label: "Delivery", key: "delivery_status" },
  { label: "Feedback", key: "feedback_status" }
] as const;

function getNextStage(order: Record<string, any>) {
  const stage = orderStageKeys.find((item) => String(order[item.key] || "pending") !== "done");
  return stage?.label || "Closed";
}

function getOrderRisk(order: Record<string, any>) {
  const values = orderStageKeys.map((item) => String(order[item.key] || "pending").toLowerCase());
  if (values.includes("blocked") || order.priority === "critical") return "Critical";
  if (order.priority === "high" || values.includes("pending")) return "High";
  if (values.includes("in_progress")) return "Active";
  return "Normal";
}

function riskTone(risk: string) {
  if (risk === "Critical") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "High") return "border-amber-200 bg-amber-50 text-amber-700";
  if (risk === "Active") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function buildNextOrderNumber(orders: Record<string, any>[]) {
  const highest = orders.reduce((max, order) => {
    const match = String(order.order_number || "").match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 2452);

  return `ORD-${highest + 1}`;
}

export async function OrderToDeliveryDashboard() {
  const data = await getModuleData();
  const feed = await getOrderDeliveryFeed();
  const erpOrders = data.salesOrders;
  const invoicesByNumber = new Map(data.invoices.map((invoice) => [String(invoice.invoice_number || "").toLowerCase(), invoice]));
  const orderRows = feed.entries.slice(0, 14);
  const processRows = feed.processes.slice(0, 12);
  const isOrderMode = feed.mode === "orders";
  const uniqueOrders = new Set(feed.entries.map((entry) => entry.orderNumber).filter(Boolean)).size;
  const dispatchDone = feed.entries.filter((entry) => entry.dispatchStatus.toLowerCase() === "done").length;
  const billingDone = feed.entries.filter((entry) => entry.billingStatus.toLowerCase() === "done").length;
  const canEditSales = canAccessModule(data.access, "sales", "edit");
  const erpDispatchDone = erpOrders.filter((order) => order.dispatch_status === "done").length;
  const erpBillingDone = erpOrders.filter((order) => order.billing_status === "done").length;
  const erpDeliveryDone = erpOrders.filter((order) => order.delivery_status === "done").length;
  const paymentBlocked = erpOrders.filter((order) => order.payment_check_status === "blocked").length;
  const stockBlocked = erpOrders.filter((order) => order.stock_status === "blocked").length;
  const tallyLinked = erpOrders.filter((order) => {
    const invoiceKey = String(order.tally_invoice_number || order.order_number || "").toLowerCase();
    return Boolean(order.tally_invoice_number || invoicesByNumber.get(invoiceKey));
  }).length;
  const erpPending = erpOrders.filter((order) =>
    ["pending", "in_progress", "blocked"].includes(String(order.delivery_status || "pending"))
  ).length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayDelivery = erpOrders.filter((order) => String(order.delivery_date || "").slice(0, 10) === todayIso).length;
  const overdueDelivery = erpOrders.filter((order) => {
    const deliveryDate = String(order.delivery_date || "").slice(0, 10);
    return deliveryDate && deliveryDate < todayIso && String(order.delivery_status || "pending") !== "done";
  }).length;
  const orderControlCards = erpOrders.slice(0, 8);
  const nextOrderNumber = buildNextOrderNumber(erpOrders);

  const metrics = isOrderMode
    ? [
        { label: "ERP orders", value: erpOrders.length, note: "Internal punch records", icon: ShoppingCart },
        { label: "Imported rows", value: feed.entries.length, note: `${uniqueOrders} order keys`, icon: Users },
        { label: "Dispatch done", value: erpDispatchDone || dispatchDone, note: "Dispatch stage complete", icon: PackageCheck },
        { label: "Billing done", value: erpBillingDone || billingDone, note: "Invoice stage complete", icon: FileText },
        { label: "Tally linked", value: tallyLinked, note: "Invoice number matched", icon: ShieldCheck }
      ]
    : [
        { label: "FMS processes", value: feed.processes.length, note: "Mapped from master", icon: Route },
        { label: "Doer mapped", value: countReady(feed.processes.map((row) => row.doer)), note: "Ownership visible", icon: UserCheck },
        { label: "FMS links", value: countReady(feed.processes.map((row) => row.fms)), note: "Process links present", icon: ClipboardList },
        { label: "Dashboards", value: countReady(feed.processes.map((row) => row.dashboard)), note: "Review surfaces", icon: PackageCheck }
      ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                Sales & CRM
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Order to Delivery FMS</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/82">
                ERP order entry, delivery date, sales executive, customer, SKU items and order proof tracking in one FMS flow.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
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

        {feed.error && (
          <div className="mx-4 mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Sheet mapping note</p>
                <p className="mt-1 leading-5">{feed.error}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "1. Bulk import",
            value: feed.entries.length ? "Connected" : "Needs access",
            note: feed.entries.length ? `${feed.entries.length} FMS rows readable` : "Published CSV access required",
            tone: feed.entries.length ? "text-emerald-700" : "text-amber-700",
            icon: ClipboardList
          },
          {
            title: "2. Payment hold",
            value: paymentBlocked,
            note: "Accounts block before dispatch",
            tone: paymentBlocked ? "text-red-700" : "text-emerald-700",
            icon: AlertTriangle
          },
          {
            title: "3. Stock hold",
            value: stockBlocked,
            note: "Warehouse allocation issues",
            tone: stockBlocked ? "text-red-700" : "text-emerald-700",
            icon: PackageCheck
          },
          {
            title: "4. Tally billing",
            value: tallyLinked,
            note: "Orders matched with invoices",
            tone: tallyLinked ? "text-emerald-700" : "text-slate-700",
            icon: ShieldCheck
          },
          {
            title: "5. Today delivery",
            value: todayDelivery,
            note: "Due today from ERP flow",
            tone: todayDelivery ? "text-sky-700" : "text-slate-700",
            icon: Truck
          },
          {
            title: "6. Overdue risk",
            value: overdueDelivery,
            note: "Delivery date crossed",
            tone: overdueDelivery ? "text-red-700" : "text-emerald-700",
            icon: AlertTriangle
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="surface-panel rounded-md p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{item.title}</p>
                  <p className={`mt-2 text-2xl font-semibold ${item.tone}`}>{item.value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-md border bg-white/95 shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Live Control</p>
              <h2 className="mt-1 text-xl font-semibold">Order Control Board</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sales order se delivery close tak har order ka current bottleneck, risk aur next action ek jagah.
              </p>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="font-semibold">{erpPending}</p>
                <p className="text-muted-foreground">Open delivery</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="font-semibold">{erpDeliveryDone}</p>
                <p className="text-muted-foreground">Delivered</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="font-semibold">{erpBillingDone}</p>
                <p className="text-muted-foreground">Billed</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="font-semibold">{stockBlocked + paymentBlocked}</p>
                <p className="text-muted-foreground">Holds</p>
              </div>
            </div>
          </div>
        </div>
        {erpOrders.length ? (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {orderControlCards.map((order) => {
              const firstItem = Array.isArray(order.sales_order_items) ? order.sales_order_items[0] : null;
              const product = firstItem?.products;
              const tallyInvoice = invoicesByNumber.get(String(order.tally_invoice_number || order.order_number || "").toLowerCase());
              const risk = getOrderRisk(order);
              return (
                <article key={order.id} className="rounded-md border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{order.order_number}</p>
                        <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase ${riskTone(risk)}`}>{risk}</span>
                        <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                          Next: {getNextStage(order)}
                        </span>
                      </div>
                      <h3 className="mt-2 truncate text-lg font-semibold">{order.customers?.name || "Buyer pending"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product?.name || "Item pending"} · {firstItem?.quantity || "-"} {product?.unit || ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-left lg:text-right">
                      <p className="text-xl font-semibold">{currencyFormatter.format(Number(order.total || 0))}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Delivery: {order.delivery_date || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    {orderStageKeys.map((stage) => {
                      const value = String(order[stage.key] || "pending");
                      return (
                        <div key={`${order.id}-${stage.key}`} className="rounded-md border bg-muted/25 p-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{stage.label}</p>
                          <span className={`mt-1 inline-flex rounded-sm px-2 py-1 text-xs font-semibold capitalize ${statusTone(value)}`}>
                            {statusLabel(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.15fr]">
                    <div className="rounded-md border bg-slate-50/75 p-3 text-sm">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Owner</p>
                          <p className="mt-1 font-medium">{order.sales_executive || "Sales owner pending"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Tally</p>
                          {order.tally_invoice_number || tallyInvoice ? (
                            <p className="mt-1 font-medium text-emerald-700">{order.tally_invoice_number || tallyInvoice?.invoice_number}</p>
                          ) : (
                            <p className="mt-1 font-medium text-muted-foreground">Invoice pending</p>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {order.remarks || "No internal remark yet. Update proof links and stage status from the action panel."}
                      </p>
                    </div>
                    {canEditSales ? <OrderFlowUpdateForm order={order} /> : <span className="text-muted-foreground">View only</span>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Abhi ERP me order punch nahi hua. Manual form ya bulk CSV se first order add karo.
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        {canEditSales ? (
          <OrderPunchForm
            customers={data.customers as Option[]}
            products={data.products as Option[]}
            isAdmin={data.access.isAdmin}
            nextOrderNumber={nextOrderNumber}
          />
        ) : (
          <div className="rounded-md border bg-white/95 p-4 shadow-sm">
            <h2 className="text-xl font-semibold">Order Punch</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aapke role me order create permission enabled nahi hai.</p>
          </div>
        )}
        {canEditSales ? <OrderBulkImportForm /> : null}
      </section>

      {isOrderMode ? (
        <section className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Order FMS Reference</h2>
            <p className="mt-1 text-sm text-muted-foreground">Latest rows from ERP import and order punch records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                {["Order", "Vendor/Customer", "Delivery Date", "Qty / Value", "Payment", "Stock", "Dispatch", "Billing", "Feedback", "Links"].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {orderRows.length ? (
                  orderRows.map((entry) => (
                    <tr key={`${entry.orderNumber}-${entry.timestamp}-${entry.sku}`}>
                      <td className="px-4 py-3 font-medium">{entry.orderNumber}</td>
                      <td className="px-4 py-3">{entry.vendorName}</td>
                      <td className="px-4 py-3">{entry.deliveryDate}</td>
                      <td className="px-4 py-3">
                        <span className="block">{entry.qty} {entry.unit !== "-" ? entry.unit : ""}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{entry.estimateNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-sm px-2 py-1 text-xs font-semibold capitalize ${statusTone(entry.overdueStatus)}`}>
                          {entry.overdueStatus}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">{entry.overdueDoer}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {entry.stockStatus}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">{entry.stockDoer !== "-" ? entry.stockDoer : entry.inventoryAvailable}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {entry.dispatchStatus}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">{entry.dispatchDoer !== "-" ? entry.dispatchDoer : `Qty ${entry.dispatchQuantity}`}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {entry.billingStatus}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">{entry.billingDoer}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {entry.feedbackStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {[
                            ["Order", entry.imageUrl],
                            ["Dispatch", entry.dispatchImageUrl],
                            ["Invoice", entry.invoiceImageUrl],
                            ["PO", entry.poImageUrl]
                          ].map(([label, href]) =>
                            href !== "-" ? (
                              <Link
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                {label}
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            ) : null
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={10}>
                      No order rows yet. Punch an order in ERP or use bulk import.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="rounded-md border bg-white/95 shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-xl font-semibold">Order to Delivery Process Map</h2>
              <p className="mt-1 text-sm text-muted-foreground">FMS and ownership rows from the linked RGS system master.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Department", "Process", "Doer", "Auditor", "Problem Solver", "Executive", "Checklist"].map((column) => (
                      <th key={column} className="px-4 py-3 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {processRows.map((row) => (
                    <tr key={`${row.department}-${row.process}-${row.doer}`}>
                      <td className="px-4 py-3">{row.department}</td>
                      <td className="px-4 py-3 font-medium">{row.process}</td>
                      <td className="px-4 py-3">{row.doer}</td>
                      <td className="px-4 py-3">{row.auditor}</td>
                      <td className="px-4 py-3">{row.problemSolver}</td>
                      <td className="px-4 py-3">{row.executive}</td>
                      <td className="px-4 py-3">{row.checklist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border bg-white/95 shadow-sm">
              <div className="border-b px-4 py-3">
                <h2 className="text-xl font-semibold">FMS Controls</h2>
                <p className="mt-1 text-sm text-muted-foreground">Order form and process readiness.</p>
              </div>
              <div className="space-y-3 p-4">
                {[
                  ["ERP Order Punch", "Ready", "Manual order entry is available."],
                  ["Bulk Import", "Ready", "CSV upload can update multiple orders together."],
                  ["Order Register", "Ready", "ERP order rows and imported records are visible."]
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
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{status}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Truck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Delivery Control</h2>
              <p className="text-sm text-muted-foreground">Order entry to delivery date visibility for sales and dispatch teams.</p>
            </div>
          </div>
        </div>
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Boss Review Ready</h2>
              <p className="text-sm text-muted-foreground">Form, FMS, checklist and dashboard links stay grouped under Sales & CRM.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
