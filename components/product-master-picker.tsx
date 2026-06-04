"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { Option } from "@/components/erp-forms";
import { formatProductMoney, numericProductValue, productMasterLabel } from "@/lib/product-master";
export { formatProductMoney, numericProductValue, productMasterLabel };

export function useProductMasterSelection(products: Option[]) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [query, setQuery] = useState("");
  const selectedProduct = products.find((product) => product.id === productId) || products[0];

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) =>
      [product.sku, product.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [products, query]);

  const visibleProducts = useMemo(() => {
    if (!selectedProduct || filteredProducts.some((product) => product.id === selectedProduct.id)) {
      return filteredProducts;
    }

    return [selectedProduct, ...filteredProducts];
  }, [filteredProducts, selectedProduct]);

  return {
    query,
    setQuery,
    productId: selectedProduct?.id || productId,
    setProductId,
    selectedProduct,
    visibleProducts,
    salesRate: numericProductValue(selectedProduct?.sales_price),
    purchaseRate: numericProductValue(selectedProduct?.purchase_price)
  };
}

export function ProductMasterSelect({
  label = "Product / SKU",
  query,
  onQueryChange,
  productId,
  onProductChange,
  products
}: {
  label?: string;
  query: string;
  onQueryChange: (value: string) => void;
  productId: string;
  onProductChange: (value: string) => void;
  products: Option[];
}) {
  const [open, setOpen] = useState(false);
  const selectedProduct = products.find((product) => product.id === productId);
  const selectedLabel = selectedProduct ? productMasterLabel(selectedProduct) : "";
  const displayValue = open ? query : selectedLabel;

  const handleSelect = (product: Option) => {
    onProductChange(product.id);
    onQueryChange(productMasterLabel(product));
    setOpen(false);
  };

  return (
    <div className="relative grid gap-2 sm:col-span-2">
      <input type="hidden" name="product_id" value={productId} />
      <label className="block min-w-0 text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        <span className="mt-1 flex h-11 items-center rounded-md border border-slate-300 bg-white px-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            value={displayValue}
            onFocus={() => {
              setOpen(true);
              onQueryChange("");
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 140)}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setOpen(true);
            }}
            placeholder="SKU code ya item name search karo"
            className="h-full min-w-0 flex-1 bg-transparent text-slate-950 outline-none placeholder:text-slate-400"
            autoComplete="off"
          />
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </label>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-xl"
          onMouseDown={(event) => event.preventDefault()}
        >
          {products.length > 0 ? (
            products.map((product) => {
              const active = product.id === productId;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className={`flex w-full min-w-0 items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm transition ${
                    active ? "bg-blue-50 text-blue-950" : "text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{product.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      SKU {product.sku || "-"}{product.unit ? ` • ${product.unit}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded border bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                    {product.sku || "No SKU"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-5 text-center text-sm text-muted-foreground">
              Master product list me matching SKU/item nahi mila.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProductMasterSnapshot({
  product,
  rateLabel = "Sales rate"
}: {
  product?: Option;
  rateLabel?: string;
}) {
  const rateValue = rateLabel.toLowerCase().includes("purchase")
    ? numericProductValue(product?.purchase_price)
    : numericProductValue(product?.sales_price);

  return (
    <aside className="min-w-0 rounded-md border bg-slate-50/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Central Product Master
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">SKU code</p>
          <p className="mt-1 break-words text-lg font-semibold text-slate-950">{product?.sku || "-"}</p>
        </div>
        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Item name</p>
          <p className="mt-1 break-words text-lg font-semibold text-slate-950">{product?.name || "-"}</p>
        </div>
        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Unit</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{product?.unit || "pcs"}</p>
        </div>
        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{rateLabel}</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {rateValue ? formatProductMoney(rateValue) : "Rate pending"}
          </p>
        </div>
      </div>
    </aside>
  );
}
