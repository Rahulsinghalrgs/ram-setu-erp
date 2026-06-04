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

type PurchasePunchClientProps = {
  action: (formData: FormData) => void | Promise<void>;
  vendors: Option[];
  products: Option[];
  isAdmin?: boolean;
  nextPurchaseNumber?: string;
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
      {pending ? "Punching PO..." : "Punch PO"}
    </button>
  );
}

export function PurchasePunchClient({
  action,
  vendors,
  products,
  isAdmin = false,
  nextPurchaseNumber = "PO-1001"
}: PurchasePunchClientProps) {
  const [quantity, setQuantity] = useState("");
  const [adminRate, setAdminRate] = useState("");
  const productSelection = useProductMasterSelection(products);
  const { query, setQuery, productId, setProductId, selectedProduct, visibleProducts, purchaseRate } = productSelection;
  const fixedRate = isAdmin ? numericProductValue(adminRate || purchaseRate) : purchaseRate;
  const totalPreview = numericProductValue(quantity) * fixedRate;
  const canSubmit = vendors.length > 0 && products.length > 0;

  useEffect(() => {
    setAdminRate(purchaseRate ? String(purchaseRate) : "");
  }, [selectedProduct?.id, purchaseRate]);

  return (
    <form action={action} className="w-full min-w-0 overflow-hidden rounded-md border bg-white/95 shadow-sm">
      <div className="border-b bg-slate-50/80 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Purchase FMS</p>
            <h2 className="mt-1 text-xl font-semibold">Create PO and start purchase flow</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
              Supplier PO, SKU purchase rate, quantity, GST value aur receiving follow-up ek centralized Product Master se linked rahega.
            </p>
          </div>
          <div className="rounded-md border bg-white px-3 py-2 text-xs font-medium text-muted-foreground">
            Supplier / PO / Stock Receipt / Vendor Bill / Payment
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block min-w-0 text-sm">
            <span className="font-medium text-slate-900">PO number</span>
            <input
              name="order_number"
              value={nextPurchaseNumber}
              readOnly
              className="mt-1 h-10 w-full rounded-md border border-blue-200 bg-blue-50 px-3 font-semibold text-blue-950 outline-none"
            />
            <span className="mt-1 block text-xs text-muted-foreground">Auto-generated from latest purchase order.</span>
          </label>

          <label className="block min-w-0 text-sm">
            <span className="font-medium text-slate-900">Supplier / vendor</span>
            <select
              name="vendor_id"
              required
              defaultValue=""
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>
                {vendors.length ? "Select supplier" : "Vendor master empty hai"}
              </option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>

          <ProductMasterSelect
            label="Item / SKU"
            query={query}
            onQueryChange={setQuery}
            productId={productId}
            onProductChange={setProductId}
            products={visibleProducts}
          />

          {!canSubmit ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900 sm:col-span-2">
              Purchase punch ke liye Vendor Master aur Product Master dono ready hone chahiye. Pehle missing master data add karo, phir PO save hoga.
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
              Purchase rate
              {!isAdmin && <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
            </span>
            <input
              name="unit_price"
              type="number"
              value={isAdmin ? adminRate : purchaseRate || ""}
              onChange={(event) => setAdminRate(event.target.value)}
              readOnly={!isAdmin}
              placeholder="Product master purchase rate"
              className={`mt-1 h-10 w-full rounded-md border px-3 outline-none ${
                isAdmin
                  ? "border-slate-300 bg-white text-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  : "border-slate-200 bg-slate-100 font-semibold text-slate-700"
              }`}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {isAdmin ? "Admin purchase rate editor enabled." : "Only admin can edit purchase rate."}
            </span>
          </label>

          {isAdmin && <TextInput name="total" label="PO total override" type="number" placeholder="Optional" />}
          <TextInput name="order_date" label="PO date" type="date" />
          <TextInput name="expected_date" label="Expected receipt date" type="date" />
          <TextInput name="reference" label="Reference" placeholder="Vendor quotation / import ref" />
          <TextInput name="remarks" label="Remarks" placeholder="QC, packing, transport, advance payment note" className="sm:col-span-2" />
        </div>

        <div className="min-w-0">
          <ProductMasterSnapshot product={selectedProduct} rateLabel="Purchase rate" />
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-900/70">Estimated PO value</p>
            <p className="mt-1 text-2xl font-semibold text-blue-950">{formatProductMoney(totalPreview)}</p>
            <p className="mt-1 text-xs leading-5 text-blue-900/75">
              Quantity x fixed purchase rate. Admin total override use karega to final PO value override ho sakti hai.
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
