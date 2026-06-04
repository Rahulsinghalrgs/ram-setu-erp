"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import type { Option } from "@/components/erp-forms";
import {
  formatProductMoney,
  numericProductValue,
  ProductMasterSelect,
  ProductMasterSnapshot,
  useProductMasterSelection
} from "@/components/product-master-picker";

type OrderPunchClientProps = {
  action: (formData: FormData) => void | Promise<void>;
  customers: Option[];
  products: Option[];
  isAdmin?: boolean;
  nextOrderNumber?: string;
};

function TextInput({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  className = ""
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 text-sm ${className}`}>
      <span className="font-medium text-slate-900">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending || disabled}
      className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Punching order..." : "Punch order"}
    </button>
  );
}

export function OrderPunchClient({
  action,
  customers,
  products,
  isAdmin = false,
  nextOrderNumber = "ORD-2453"
}: OrderPunchClientProps) {
  const [quantity, setQuantity] = useState("");
  const [adminRate, setAdminRate] = useState("");
  const productSelection = useProductMasterSelection(products);
  const { query, setQuery, productId, setProductId, selectedProduct, visibleProducts, salesRate } = productSelection;
  const fixedRate = isAdmin ? numericProductValue(adminRate || salesRate) : salesRate;
  const totalPreview = numericProductValue(quantity) * fixedRate;
  const canSubmit = customers.length > 0 && products.length > 0;

  useEffect(() => {
    setAdminRate(salesRate ? String(salesRate) : "");
  }, [selectedProduct?.id, salesRate]);

  return (
    <form action={action} className="w-full min-w-0 overflow-hidden rounded-md border bg-white/95 shadow-sm">
      <div className="border-b bg-slate-50/80 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Order Punch</p>
            <h2 className="mt-1 text-xl font-semibold">Create order and start delivery flow</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
              Order number auto-generate hoga, SKU product master se select hoga, aur rate locked rahega.
            </p>
          </div>
          <div className="rounded-md border bg-white px-3 py-2 text-xs font-medium text-muted-foreground">
            Payment / Stock / Dispatch / Billing / Delivery / Feedback
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block min-w-0 text-sm">
            <span className="font-medium text-slate-900">Order number</span>
            <input
              name="order_number"
              value={nextOrderNumber}
              readOnly
              className="mt-1 h-10 w-full rounded-md border border-blue-200 bg-blue-50 px-3 font-semibold text-blue-950 outline-none"
            />
            <span className="mt-1 block text-xs text-muted-foreground">Auto-generated from latest ERP order.</span>
          </label>

          <label className="block min-w-0 text-sm">
            <span className="font-medium text-slate-900">Client name</span>
            <select
              name="customer_id"
              required
              defaultValue=""
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>
                {customers.length ? "Select client" : "Client master empty hai"}
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <ProductMasterSelect
            label="Search SKU / item name"
            query={query}
            onQueryChange={setQuery}
            productId={productId}
            onProductChange={setProductId}
            products={visibleProducts}
          />

          {!canSubmit ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900 sm:col-span-2">
              Order punch ke liye Client Master aur Product Master dono ready hone chahiye. Pehle missing master data add karo, phir order save hoga.
            </div>
          ) : null}

          <label className="block min-w-0 text-sm">
            <span className="font-medium text-slate-900">Quantity</span>
            <input
              name="quantity"
              type="number"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="50000"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block min-w-0 text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-900">
              Rate
              {!isAdmin && <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
            </span>
            <input
              name="unit_price"
              type="number"
              value={isAdmin ? adminRate : salesRate || ""}
              onChange={(event) => setAdminRate(event.target.value)}
              readOnly={!isAdmin}
              placeholder="Product master rate"
              className={`mt-1 h-10 w-full rounded-md border px-3 outline-none ${
                isAdmin
                  ? "border-slate-300 bg-white text-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  : "border-slate-200 bg-slate-100 font-semibold text-slate-700"
              }`}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {isAdmin ? "Admin sales rate editor enabled." : "Sales rate Product Master se locked hai. Only admin edit kar sakta hai."}
            </span>
          </label>

          {isAdmin && (
            <TextInput name="total" label="Order total override" type="number" placeholder="Optional" />
          )}
          <TextInput name="order_date" label="Order date" type="date" />
          <TextInput name="delivery_date" label="Delivery date" type="date" />
          <TextInput name="sales_executive" label="Sales executive" placeholder="Rahul / Sales team" />

          <label className="block min-w-0 text-sm">
            <span className="font-medium text-slate-900">Priority</span>
            <select name="priority" defaultValue="medium" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
              <option value="low">Low</option>
            </select>
          </label>

          <TextInput name="order_source" label="Order source" placeholder="Phone / WhatsApp / ERP" />
          <TextInput name="po_url" label="PO link" placeholder="Google Drive / WhatsApp proof URL" />
          <TextInput name="order_proof_url" label="Order proof link" placeholder="Form image / sheet proof URL" />

          <label className="block min-w-0 text-sm sm:col-span-2">
            <span className="font-medium text-slate-900">Remarks</span>
            <input
              name="remarks"
              placeholder="Delivery instruction, customer note, packaging requirement"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="min-w-0">
          <ProductMasterSnapshot product={selectedProduct} rateLabel="Sales rate" />
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-900/70">Estimated total</p>
            <p className="mt-1 text-2xl font-semibold text-blue-950">{formatProductMoney(totalPreview)}</p>
            <p className="mt-1 text-xs leading-5 text-blue-900/75">
              Quantity x fixed rate. Admin total override use karega to final order value override ho sakti hai.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t bg-white px-4 py-4">
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}
