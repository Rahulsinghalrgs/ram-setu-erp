export const permissionModules = [
  { key: "customers", label: "Buyers" },
  { key: "vendors", label: "Suppliers" },
  { key: "products", label: "Catalogue" },
  { key: "inventory", label: "Inventory" },
  { key: "field_operations", label: "Field Operations" },
  { key: "sales", label: "Sales & Dispatch" },
  { key: "purchases", label: "Purchases & Imports" },
  { key: "invoices", label: "Invoices" },
  { key: "reports", label: "Management Reports" }
] as const;

export type PermissionModuleKey = (typeof permissionModules)[number]["key"];
export type PermissionAction = "view" | "edit";

export function isPermissionModuleKey(value: string): value is PermissionModuleKey {
  return permissionModules.some((module) => module.key === value);
}

export function permissionLabel(key: string) {
  return permissionModules.find((module) => module.key === key)?.label || key;
}
