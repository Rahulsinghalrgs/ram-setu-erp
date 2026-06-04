import { RecordTable } from "@/components/record-table";
import { getDashboardData, requireModuleAccess } from "@/lib/erp-queries";
import { currencyFormatter } from "@/lib/utils";

export default async function ReportsPage() {
  await requireModuleAccess("reports");
  const data = await getDashboardData();
  const orderBook = data.salesOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const receivable = data.invoices.reduce((sum, invoice) => sum + Number(invoice.balance_due), 0);

  return (
    <RecordTable
      title="Management Reports"
      description="Live management summary from Supabase records."
      columns={["Report", "Value", "Status", "Owner"]}
      rows={[
        ["Order book", currencyFormatter.format(orderBook), "Live", "Sales"],
        ["Receivables", currencyFormatter.format(receivable), "Live", "Finance"],
        ["Product SKUs", data.products.length, "Live", "Operations"],
        ["Buyer accounts", data.customers.length, "Live", "Sales"]
      ]}
    />
  );
}
