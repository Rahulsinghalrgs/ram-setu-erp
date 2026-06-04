import {
  BadgeIndianRupee,
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Landmark,
  MapPinned,
  Package,
  ReceiptIndianRupee,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon
} from "lucide-react";

export const modules = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: BarChart3,
    key: "overview"
  },
  {
    href: "/dashboard/customers",
    label: "Buyers",
    icon: Users,
    key: "customers"
  },
  {
    href: "/dashboard/vendors",
    label: "Suppliers",
    icon: Truck,
    key: "vendors"
  },
  {
    href: "/dashboard/products",
    label: "Catalogue",
    icon: Package,
    key: "products"
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    icon: Boxes,
    key: "inventory"
  },
  {
    href: "/dashboard/field-operations",
    label: "Field Operations",
    icon: MapPinned,
    key: "field_operations"
  },
  {
    href: "/dashboard/sales",
    label: "Sales & Dispatch",
    icon: ShoppingCart,
    key: "sales"
  },
  {
    href: "/dashboard/purchases",
    label: "Purchases & Imports",
    icon: ReceiptIndianRupee,
    key: "purchases"
  },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    icon: FileText,
    key: "invoices"
  },
  {
    href: "/dashboard/reports",
    label: "Management Reports",
    icon: Landmark,
    key: "reports"
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Building2,
    key: "settings"
  }
];

type SidebarGroup = {
  href: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  keys: string[];
  systems: {
    label: string;
    href: string;
    count: number;
    examples: string[];
  }[];
  adminOnly?: boolean;
};

export const sidebarGroups: SidebarGroup[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    subtitle: "Today view, KPIs, approvals",
    icon: BarChart3,
    keys: ["overview"],
    systems: [
      {
        label: "Control Dashboard",
        href: "/dashboard?system=control-dashboard",
        count: 3,
        examples: ["Command center", "KPIs", "Boss snapshot"]
      },
      {
        label: "MIS & Approvals",
        href: "/dashboard/reports?system=mis",
        count: 4,
        examples: ["Management focus", "Daily approvals", "Reports"]
      },
      {
        label: "Live Data Capture",
        href: "/dashboard?system=data-collection",
        count: 4,
        examples: ["Order book", "Inventory health", "Dispatch pending"]
      },
      {
        label: "Dashboard Checklist",
        href: "/dashboard/checklists?department=dashboard",
        count: 3,
        examples: ["Daily KPI check", "Boss review", "Approval closure"]
      },
      {
        label: "Task Delegation",
        href: "/dashboard/delegation",
        count: 3,
        examples: ["Assign task", "Track doer", "Deadline follow-up"]
      },
      {
        label: "MIS Report",
        href: "/dashboard/mis",
        count: 3,
        examples: ["Checklist + delegation", "Completion %", "Department score"]
      }
    ]
  },
  {
    href: "/dashboard/sales",
    label: "Sales & CRM",
    subtitle: "Enquiry, buyers, orders, complaints",
    icon: Users,
    keys: ["customers", "sales"],
    systems: [
      {
        label: "Enquiry & Lead Flow",
        href: "/dashboard/sales?system=enquiry-lead-flow",
        count: 3,
        examples: ["Sale Chain/Enquiry FMS", "Enquiry sheet", "CRM FMS"]
      },
      {
        label: "Order to Delivery",
        href: "/dashboard/sales?system=order-to-delivery",
        count: 2,
        examples: ["Order to Delivery FMS", "On Time Delivery"]
      },
      {
        label: "Complaints & Returns",
        href: "/dashboard/sales?system=complaints-returns",
        count: 2,
        examples: ["Customer Complaint Registration FMS", "Return Goods"]
      },
      {
        label: "Client Database",
        href: "/dashboard/customers?system=client-database",
        count: 6,
        examples: ["Client Master", "Contacts", "Credit terms", "Follow-up dates"]
      },
      {
        label: "Sales Checklist",
        href: "/dashboard/checklists?department=sales",
        count: 3,
        examples: ["Sales Ultimate Checklist", "Order proof", "Client follow-up"]
      }
    ]
  },
  {
    href: "/dashboard/purchases",
    label: "Purchase & Imports",
    subtitle: "Suppliers, PO, import tracking",
    icon: Truck,
    keys: ["vendors", "purchases"],
    systems: [
      {
        label: "Purchase FMS",
        href: "/dashboard/purchases?system=purchase-fms",
        count: 4,
        examples: ["PO punch", "Supplier follow-up", "SKU purchase rate", "Bulk import"]
      },
      {
        label: "Vendor Development",
        href: "/dashboard/vendors?system=vendor-development",
        count: 2,
        examples: ["New Vendor Development FMS", "Supplier onboarding"]
      },
      {
        label: "Quotation Control",
        href: "/dashboard/purchases?system=quotation-control",
        count: 2,
        examples: ["Shipping quotation", "Quotation invoice summary"]
      },
      {
        label: "Purchase Checklist",
        href: "/dashboard/checklists?department=purchases",
        count: 3,
        examples: ["Import purchase checkpoints", "Vendor documents", "PO approvals"]
      }
    ]
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory & Operations",
    subtitle: "Stock, dispatch, field visits",
    icon: Boxes,
    keys: ["products", "inventory", "field_operations"],
    systems: [
      {
        label: "IMS Control",
        href: "/dashboard/inventory?system=ims-control",
        count: 2,
        examples: ["BVI Ultimate IMS", "Rahul Sir IMS"]
      },
      {
        label: "Stock Reconciliation",
        href: "/dashboard/inventory?system=stock-reconciliation",
        count: 2,
        examples: ["Stock Reconciliation Tool", "Stock Difference Entry"]
      },
      {
        label: "Product Master",
        href: "/dashboard/products?system=product-master",
        count: 2,
        examples: ["Product Specifications", "Catalogue Data"]
      },
      {
        label: "Dispatch Flow",
        href: "/dashboard/field-operations?system=dispatch-flow",
        count: 2,
        examples: ["Material Dispatch Form", "Order to Delivery"]
      },
      {
        label: "Field Visit Tracking",
        href: "/dashboard/field-operations?system=field-tracking",
        count: 3,
        examples: ["Field Staff Tracking", "Documents Tracking", "Field Visit Proof"]
      },
      {
        label: "Returns & QC",
        href: "/dashboard/field-operations?system=returns-qc",
        count: 3,
        examples: ["Return Goods", "Dispatch proof", "QC checklist"]
      },
      {
        label: "Operations Checklist",
        href: "/dashboard/checklists?department=inventory",
        count: 3,
        examples: ["Stock audit", "Dispatch proof", "Field visit closure"]
      }
    ]
  },
  {
    href: "/dashboard/invoices",
    label: "Accounts & Billing",
    subtitle: "Invoices, payments, overdue",
    icon: BadgeIndianRupee,
    keys: ["invoices", "reports"],
    systems: [
      {
        label: "Billing & Payments",
        href: "/dashboard/invoices?system=billing-payments",
        count: 2,
        examples: ["Company Payment FMS", "Credit Card Payment Entry"]
      },
      {
        label: "Payment Follow-up",
        href: "/dashboard/invoices?system=payment-follow-up",
        count: 3,
        examples: ["Outstanding ageing", "Promise to pay", "Follow-up log"]
      },
      {
        label: "Cash Flow MIS",
        href: "/dashboard/reports?system=cash-flow-mis",
        count: 2,
        examples: ["Cash Flow Mastery", "Daily/Weekly/Monthly Notes"]
      },
      {
        label: "Debtors & Overdue",
        href: "/dashboard/invoices?system=debtors-overdue",
        count: 2,
        examples: ["Sundry Debtors Overdue", "Credit Terms"]
      },
      {
        label: "Accounts Checklist",
        href: "/dashboard/checklists?department=accounts",
        count: 3,
        examples: ["Accounts Ultimate Checklist", "Payment follow-up", "Daily approvals"]
      }
    ]
  },
  {
    href: "/dashboard/reports",
    label: "HR, Admin & Management",
    subtitle: "Tasks, reports, policies, settings",
    icon: Building2,
    keys: ["reports", "settings"],
    systems: [
      {
        label: "Attendance & Leave",
        href: "/dashboard/settings?system=attendance-leave",
        count: 3,
        examples: ["Employee Attendance", "Leave Tracker", "Leave Request"]
      },
      {
        label: "Employee Lifecycle",
        href: "/dashboard/settings?system=employee-lifecycle",
        count: 4,
        examples: ["Employee Master", "Pre-Interview", "Resignation", "Exit Interview"]
      },
      {
        label: "Assets & Documents",
        href: "/dashboard/settings?system=assets-documents",
        count: 4,
        examples: ["Employee Assets", "Office Assets", "Documents Tracking"]
      },
      {
        label: "Delegation & Tasks",
        href: "/dashboard/reports?system=delegation-tasks",
        count: 4,
        examples: ["EA Delegation Sheet", "Delegation Script", "Daily Task", "MDO Discussion"]
      },
      {
        label: "Communication Center",
        href: "/dashboard/settings?system=communication-center",
        count: 3,
        examples: ["WATI WhatsApp", "Email reminders", "Communication log"]
      },
      {
        label: "HR/Admin Checklist",
        href: "/dashboard/checklists?department=hr",
        count: 3,
        examples: ["Attendance closure", "Task review", "Policy checks"]
      },
      {
        label: "Compliance & Policies",
        href: "/dashboard/reports?system=compliance-policies",
        count: 5,
        examples: ["Compliance FMS", "Maintenance FMS", "Vehicle Pollution/Insurance", "Policies"]
      },
      {
        label: "Social Media Control",
        href: "/dashboard/settings?system=social-media-control",
        count: 1,
        examples: ["Social Media posting checklist"]
      }
    ]
  }
];

export const kpis = [
  { label: "Confirmed order book", value: "INR 18.4L", trend: "+18%", note: "This month" },
  { label: "Ready inventory", value: "INR 32.6L", trend: "+11%", note: "Available stock" },
  { label: "Dispatch pending", value: "68 cartons", trend: "Today", note: "Wazirpur release" },
  { label: "QC pass rate", value: "98.7%", trend: "+2.4%", note: "Last 30 days" }
];

export const operations = [
  {
    title: "Bulk connector pin order",
    status: "Ready for GST invoice",
    party: "Mobile accessories manufacturer",
    amount: 286000
  },
  {
    title: "Imported wire consignment",
    status: "Quality testing",
    party: "Premium TPE and braided wires",
    amount: 420000
  },
  {
    title: "Fast dispatch",
    status: "Wazirpur stock release",
    party: "CCTV BNC and DC pins",
    amount: 68
  }
];

export const companyHighlights = [
  "Connector pins and premium wire focus",
  "In-house quality testing workflow",
  "Ready inventory and fast dispatch",
  "Wholesale pricing and GST control"
];

export const companyFacts = [
  { label: "Business", value: "Manufacturer, importer and supplier" },
  { label: "Core products", value: "Connector pins, CCTV/BNC components, charger/DC pins, premium wires" },
  { label: "Operations", value: "In-house testing, automated processing, ready inventory, fast dispatch" },
  { label: "Head office", value: "C-57, 3rd Floor, Wazirpur Industrial Area, Delhi" }
];

export const pipelineStages = [
  { label: "Inquiry", value: 18, amount: "INR 7.8L" },
  { label: "Quotation", value: 11, amount: "INR 5.6L" },
  { label: "Confirmed", value: 8, amount: "INR 18.4L" },
  { label: "Packed", value: 5, amount: "INR 6.4L" },
  { label: "Dispatched", value: 12, amount: "INR 9.2L" }
];

export const priorityOrders = [
  {
    order: "SO-RGS-1007",
    buyer: "Mobile accessories manufacturer",
    items: "Type-C connector pins",
    status: "Ready for GST invoice",
    eta: "Today",
    value: "INR 2.86L"
  },
  {
    order: "SO-RGS-1008",
    buyer: "Cable assembly unit",
    items: "Braided charging/data wire",
    status: "Packing",
    eta: "Tomorrow",
    value: "INR 1.42L"
  },
  {
    order: "SO-RGS-1009",
    buyer: "CCTV distributor",
    items: "BNC and DC connector pins",
    status: "Stock allocated",
    eta: "29 Apr",
    value: "INR 88.4K"
  }
];

export const inventoryHealth = [
  { sku: "PIN-TYPEC-001", name: "Type-C connector pin", stock: "18,400", reserved: "2,100", health: 82 },
  { sku: "BNC-CCTV-024", name: "CCTV BNC component", stock: "9,800", reserved: "1,250", health: 74 },
  { sku: "WIRE-BRD-100", name: "Braided cable wire", stock: "430 rolls", reserved: "40 rolls", health: 68 }
];

export const qualityChecks = [
  { label: "Pin alignment", result: "Pass", score: "99.1%" },
  { label: "Connector finish", result: "Pass", score: "98.4%" },
  { label: "Wire strength", result: "Review", score: "94.8%" }
];

export const businessMix = [
  { label: "Connector pins", value: "42%" },
  { label: "Premium wires", value: "28%" },
  { label: "CCTV/BNC parts", value: "18%" },
  { label: "Charger/DC pins", value: "12%" }
];

export const moduleSummaries: Record<
  string,
  {
    title: string;
    description: string;
    columns: string[];
    rows: string[][];
  }
> = {
  customers: {
    title: "Buyers",
    description: "GST-ready buyer master for electronics manufacturers, cable makers, CCTV suppliers, and bulk traders.",
    columns: ["Buyer segment", "Primary demand", "State", "Outstanding"],
    rows: [
      ["Mobile accessories manufacturer", "Type-C and iPhone connector pins", "Delhi NCR", "INR 2,86,000"],
      ["Cable assembly unit", "TPE and braided charging wires", "Maharashtra", "INR 1,42,500"],
      ["CCTV installation distributor", "BNC pins and CCTV components", "Karnataka", "INR 88,400"]
    ]
  },
  vendors: {
    title: "Import & Supply Partners",
    description: "Supplier onboarding for imported wires, precision connector parts, packaging, freight, and testing support.",
    columns: ["Partner", "Supply area", "Category", "Payable"],
    rows: [
      ["Overseas wire supplier", "TPE and braided cable wires", "Import", "INR 4,20,000"],
      ["Precision pin processing unit", "Mobile, DC, HDMI and Type-C pins", "Manufacturing", "INR 1,34,000"],
      ["Delhi freight and packaging partner", "Dispatch cartons and logistics", "Operations", "INR 48,600"]
    ]
  },
  products: {
    title: "Product Catalogue",
    description: "SKU catalogue for connector pins, CCTV/BNC parts, charger/DC pins, and premium cable wires.",
    columns: ["SKU", "Product", "Business line", "GST"],
    rows: [
      ["PIN-TYPEC-001", "Type-C connector pin", "Mobile connector pins", "18%"],
      ["BNC-CCTV-024", "CCTV BNC connector component", "CCTV components", "18%"],
      ["WIRE-BRD-100", "Braided charging/data cable wire", "Premium imported wires", "18%"]
    ]
  },
  inventory: {
    title: "Ready Inventory",
    description: "Warehouse balances for fast dispatch from Richa Global Sales operations.",
    columns: ["Location", "SKU", "Available", "Reserved"],
    rows: [
      ["Wazirpur, Delhi", "PIN-TYPEC-001", "18,400", "2,100"],
      ["Wazirpur, Delhi", "BNC-CCTV-024", "9,800", "1,250"],
      ["Wazirpur, Delhi", "WIRE-BRD-100", "430 rolls", "40 rolls"]
    ]
  },
  sales: {
    title: "Sales & Dispatch",
    description: "Bulk sales orders, GST invoice readiness, dispatch status, and collections.",
    columns: ["Order", "Buyer", "Status", "Total"],
    rows: [
      ["SO-RGS-1007", "Mobile accessories manufacturer", "Ready to invoice", "INR 2,86,000"],
      ["SO-RGS-1008", "Cable assembly unit", "Packing", "INR 1,42,500"],
      ["SO-RGS-1009", "CCTV distributor", "Stock allocated", "INR 88,400"]
    ]
  },
  purchases: {
    title: "Purchases & Imports",
    description: "Purchase orders, import receipts, vendor bills, and GST input tracking.",
    columns: ["PO", "Partner", "Status", "Total"],
    rows: [
      ["PO-RGS-2041", "Overseas wire supplier", "In testing", "INR 4,20,000"],
      ["PO-RGS-2042", "Precision pin processing unit", "Received", "INR 1,34,000"],
      ["PO-RGS-2043", "Freight and packaging partner", "Bill due", "INR 48,600"]
    ]
  },
  invoices: {
    title: "GST Invoices",
    description: "Invoice register with CGST, SGST, IGST, payment, and due status for bulk component supply.",
    columns: ["Invoice", "Party", "Tax", "Due"],
    rows: [
      ["INV-RGS-3001", "Mobile accessories manufacturer", "INR 43,627", "INR 2,86,000"],
      ["INV-RGS-3002", "Cable assembly unit", "INR 21,737", "INR 1,42,500"],
      ["PINV-RGS-802", "Overseas wire supplier", "INR 64,068", "INR 4,20,000"]
    ]
  },
  reports: {
    title: "Management Reports",
    description: "Reports for ready inventory, testing, dispatch, revenue, purchases, and GST.",
    columns: ["Report", "Period", "Status", "Owner"],
    rows: [
      ["GSTR sales summary", "Apr 2026", "Ready", "Finance"],
      ["Ready stock valuation", "Today", "Live", "Operations"],
      ["Quality-tested batch report", "Today", "Live", "QC"]
    ]
  },
  settings: {
    title: "Company Settings",
    description: "Organization, membership, roles, tax defaults, warehouses, and Richa Group contact information.",
    columns: ["Area", "Default", "Status", "Owner"],
    rows: [
      ["Company", "RICHA GLOBAL SALES", "Active", "Owner"],
      ["Currency", "INR", "Active", "Admin"],
      ["Tax model", "India GST", "Active", "Finance"]
    ]
  }
};
