import { InvoiceForm } from "@/components/erp-forms";
import type { Option } from "@/components/erp-forms";
import { PaymentFollowupDashboard } from "@/components/payment-followup-dashboard";
import { RecordTable } from "@/components/record-table";
import { canAccessModule, getModuleData, requireModuleAccess } from "@/lib/erp-queries";
import { currencyFormatter } from "@/lib/utils";

type InvoicesPageProps = {
  searchParams?: Promise<{ system?: string }>;
};

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const context = await requireModuleAccess("invoices");
  const params = await searchParams;

  if (params?.system === "payment-follow-up") {
    return <PaymentFollowupDashboard context={context} />;
  }

  const data = await getModuleData();

  return (
    <div className="space-y-4">
      {canAccessModule(data.access, "invoices", "edit") ? <InvoiceForm customers={data.customers as Option[]} /> : null}
      <RecordTable
        title="GST Invoices"
        description="Sales invoices with CGST/SGST split and balance due."
        columns={["Invoice", "Party", "Status", "Tax", "Balance"]}
        rows={data.invoices.map((invoice) => [
          invoice.invoice_number,
          invoice.customers?.name || invoice.vendors?.name || "-",
          invoice.status,
          currencyFormatter.format(Number(invoice.cgst) + Number(invoice.sgst) + Number(invoice.igst)),
          currencyFormatter.format(Number(invoice.balance_due))
        ])}
      />
    </div>
  );
}
