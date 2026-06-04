import { SalesOrderForm } from "@/components/erp-forms";
import type { Option } from "@/components/erp-forms";
import { OrderToDeliveryDashboard } from "@/components/order-to-delivery-dashboard";
import { RecordTable } from "@/components/record-table";
import { canAccessModule, getModuleData, requireModuleAccess } from "@/lib/erp-queries";
import { currencyFormatter } from "@/lib/utils";

type SalesPageProps = {
  searchParams?: Promise<{
    system?: string;
  }>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requireModuleAccess("sales");
  const params = await searchParams;

  if (params?.system === "order-to-delivery") {
    return <OrderToDeliveryDashboard />;
  }

  const data = await getModuleData();

  return (
    <div className="space-y-4">
      {canAccessModule(data.access, "sales", "edit") ? <SalesOrderForm customers={data.customers as Option[]} /> : null}
      <RecordTable
        title="Sales & Dispatch"
        description="Sales orders connected to buyer master and GST totals."
        columns={["Order", "Buyer", "Status", "Date", "Total"]}
        rows={data.salesOrders.map((order) => [
          order.order_number,
          order.customers?.name || "-",
          order.status,
          order.order_date,
          currencyFormatter.format(Number(order.total))
        ])}
      />
    </div>
  );
}
