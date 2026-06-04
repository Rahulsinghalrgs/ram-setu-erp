export type ProductMasterOption = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  sales_price?: number | string | null;
  purchase_price?: number | string | null;
};

export function numericProductValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatProductMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
}

export function productMasterLabel(product: ProductMasterOption) {
  return [product.sku, product.name].filter(Boolean).join(" - ") || "Product";
}
