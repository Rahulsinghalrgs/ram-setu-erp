"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseOrderDeliveryCsv, orderDeliverySheetUrl } from "@/lib/order-to-delivery";
import { permissionModules, type PermissionModuleKey } from "@/lib/access-control";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyTaskAssignment } from "@/lib/task-notifications";

type Organization = {
  id: string;
  name: string;
};

const memberRoles = ["admin", "manager", "staff"] as const;
type AssignableMemberRole = (typeof memberRoles)[number];
const employeeStatuses = new Set(["active", "inactive", "on_leave", "left", "blocked"]);
const appAccessStatuses = new Set(["not_created", "invited", "active", "blocked", "disabled"]);
const employmentTypes = new Set(["full_time", "part_time", "contract", "intern", "consultant"]);

async function requireUser() {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return { supabase: db, user };
}

async function getCurrentOrganization(): Promise<Organization | null> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("organization_members")
    .select("organizations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organization = data?.organizations;

  if (!organization) {
    return null;
  }

  return Array.isArray(organization) ? organization[0] : organization;
}

async function getCurrentMembership() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organization = data?.organizations;
  const normalizedOrganization = Array.isArray(organization) ? organization[0] : organization;

  if (!data || !normalizedOrganization) {
    return null;
  }

  return {
    organization: normalizedOrganization as Organization,
    role: data.role as string
  };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseBoolean(value: unknown, fallback = true) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  return ["yes", "y", "true", "1", "allowed", "active", "on"].includes(normalized);
}

function parseNumber(value: unknown, fallback = 0) {
  const cleaned = String(value || "").replace(/[₹,\s]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

function parseImportDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dateOnly = raw.split(/\s+/)[0];

  const match = dateOnly.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return raw;

  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizePhoneValue(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return raw;
}

function safeStorageName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function normalizeMemberRole(value: string): AssignableMemberRole {
  const normalized = normalizeHeader(value || "staff");
  return memberRoles.includes(normalized as AssignableMemberRole) ? (normalized as AssignableMemberRole) : "staff";
}

function normalizeEmployeeStatus(value: string) {
  const normalized = normalizeHeader(value || "active");
  if (["working", "joined", "current"].includes(normalized)) return "active";
  if (["resigned", "exit", "exited"].includes(normalized)) return "left";
  if (["leave"].includes(normalized)) return "on_leave";
  return employeeStatuses.has(normalized) ? normalized : "active";
}

function normalizeAppAccessStatus(value: string) {
  const normalized = normalizeHeader(value || "not_created");
  if (["created", "enabled", "login_active"].includes(normalized)) return "active";
  if (["pending", "invite_sent"].includes(normalized)) return "invited";
  if (["no", "none", "no_login"].includes(normalized)) return "not_created";
  return appAccessStatuses.has(normalized) ? normalized : "not_created";
}

function normalizeEmploymentType(value: string) {
  const normalized = normalizeHeader(value || "full_time");
  if (["fulltime", "permanent"].includes(normalized)) return "full_time";
  if (["parttime"].includes(normalized)) return "part_time";
  return employmentTypes.has(normalized) ? normalized : "full_time";
}

const checklistDepartments = {
  dashboard: { label: "Dashboard", module: "reports" },
  sales: { label: "Sales & CRM", module: "sales" },
  purchases: { label: "Purchase & Imports", module: "purchases" },
  inventory: { label: "Inventory & Operations", module: "inventory" },
  accounts: { label: "Accounts & Billing", module: "invoices" },
  hr: { label: "HR, Admin & Management", module: "reports" }
} as const;

type ChecklistDepartmentKey = keyof typeof checklistDepartments;

const checklistDepartmentAliases: Record<string, ChecklistDepartmentKey> = {
  accounts: "accounts",
  accounts_billing: "accounts",
  accounts_and_billing: "accounts",
  billing: "accounts",
  dashboard: "dashboard",
  dispatch: "inventory",
  dispatch_operations: "inventory",
  field_operations: "inventory",
  hr: "hr",
  hr_admin: "hr",
  hr_admin_management: "hr",
  inventory: "inventory",
  inventory_operations: "inventory",
  operations: "inventory",
  purchase: "purchases",
  purchase_imports: "purchases",
  purchases: "purchases",
  sales: "sales",
  sales_crm: "sales"
};

const checklistStatuses = new Set(["pending", "in_progress", "done", "blocked", "not_required"]);
const checklistPriorities = new Set(["low", "medium", "high", "critical"]);
const checklistFrequencies = new Set(["daily", "weekly", "monthly", "one_time", "event_based"]);

function normalizeChecklistDepartment(value: string): ChecklistDepartmentKey {
  const key = normalizeHeader(value || "dashboard");
  return checklistDepartmentAliases[key] || "dashboard";
}

function normalizeChecklistStatus(value: string) {
  const key = normalizeHeader(value || "pending");
  if (["complete", "completed", "closed", "yes"].includes(key)) return "done";
  if (["wip", "working", "progress"].includes(key)) return "in_progress";
  if (["na", "n_a", "not_applicable"].includes(key)) return "not_required";
  return checklistStatuses.has(key) ? key : "pending";
}

function normalizeChecklistPriority(value: string) {
  const key = normalizeHeader(value || "medium");
  return checklistPriorities.has(key) ? key : "medium";
}

function normalizeChecklistFrequency(value: string) {
  const key = normalizeHeader(value || "daily");
  if (["one_time", "once", "single"].includes(key)) return "one_time";
  if (["event", "event_based", "as_needed"].includes(key)) return "event_based";
  return checklistFrequencies.has(key) ? key : "daily";
}

function parseCsv(textValue: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < textValue.length; index += 1) {
    const char = textValue[index];
    const next = textValue[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const clientCsvAliases: Record<string, string> = {
  account_owner: "owner_name",
  address: "billing_address",
  alter_id: "tally_alter_id",
  balance: "opening_outstanding",
  bill_to: "billing_address",
  billing_email: "billing_contact_email",
  billing_name: "billing_contact_name",
  billing_phone: "billing_contact_phone",
  closing_balance: "opening_outstanding",
  company: "name",
  company_name: "name",
  contact: "contact_person",
  contact_name: "contact_person",
  contact_person_name: "contact_person",
  credit_period: "credit_days",
  customer_name: "name",
  customer: "name",
  due_amount: "opening_outstanding",
  due_date: "next_follow_up_date",
  email_id: "email",
  guid: "tally_guid",
  ledger: "tally_ledger_name",
  ledger_name: "tally_ledger_name",
  master_id: "tally_master_id",
  mobile: "phone",
  mobile_no: "phone",
  mobile_number: "phone",
  outstanding: "opening_outstanding",
  outstanding_amount: "opening_outstanding",
  party: "name",
  party_name: "name",
  salesperson: "owner_name",
  ship_to: "shipping_address",
  state: "state_name",
  tally_alterid: "tally_alter_id",
  tally_guid_id: "tally_guid",
  tally_masterid: "tally_master_id",
  whatsapp_no: "whatsapp",
  whatsapp_number: "whatsapp"
};

const clientCsvFields = new Set([
  "client_code",
  "name",
  "client_type",
  "contact_person",
  "designation",
  "owner_name",
  "phone",
  "whatsapp",
  "alternate_phone",
  "email",
  "website",
  "source",
  "gstin",
  "pan",
  "udyam",
  "state_code",
  "city",
  "state_name",
  "pincode",
  "country",
  "industry",
  "credit_limit",
  "credit_days",
  "payment_terms",
  "opening_outstanding",
  "outstanding_as_of",
  "priority",
  "status",
  "last_contact_date",
  "next_follow_up_date",
  "tally_ledger_name",
  "tally_guid",
  "tally_master_id",
  "tally_alter_id",
  "preferred_channel",
  "whatsapp_opt_in",
  "email_opt_in",
  "payment_followup_enabled",
  "order_received_enabled",
  "order_dispatch_enabled",
  "order_delivered_enabled",
  "product_requirement_enabled",
  "billing_contact_name",
  "billing_contact_phone",
  "billing_contact_email",
  "dispatch_contact_name",
  "dispatch_contact_phone",
  "dispatch_contact_email",
  "escalation_contact_name",
  "escalation_contact_phone",
  "escalation_contact_email",
  "billing_address",
  "shipping_address",
  "remarks"
]);

function normalizeClientCsvRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = clientCsvAliases[normalized] || normalized;
    if (clientCsvFields.has(field)) {
      row[field] = values[index] || "";
    }
  });

  return row;
}

function clientPayloadFromCsvRow(organizationId: string, row: Record<string, string>) {
  const payload: Record<string, any> = {
    organization_id: organizationId,
    name: row.name?.trim(),
    client_code: row.client_code || null,
    contact_person: row.contact_person || null,
    designation: row.designation || null,
    gstin: row.gstin || null,
    pan: row.pan || null,
    udyam: row.udyam || null,
    state_code: row.state_code || null,
    email: row.email?.toLowerCase() || null,
    phone: normalizePhoneValue(row.phone),
    whatsapp: normalizePhoneValue(row.whatsapp),
    alternate_phone: normalizePhoneValue(row.alternate_phone),
    website: row.website || null,
    client_type: row.client_type || "buyer",
    industry: row.industry || null,
    source: row.source || null,
    owner_name: row.owner_name || null,
    tally_ledger_name: row.tally_ledger_name || row.name || null,
    tally_guid: row.tally_guid || null,
    tally_master_id: row.tally_master_id || null,
    tally_alter_id: row.tally_alter_id || null,
    city: row.city || null,
    state_name: row.state_name || null,
    pincode: row.pincode || null,
    country: row.country || "India",
    billing_address: row.billing_address || null,
    shipping_address: row.shipping_address || null,
    credit_limit: parseNumber(row.credit_limit),
    credit_days: parseNumber(row.credit_days),
    payment_terms: row.payment_terms || null,
    opening_outstanding: parseNumber(row.opening_outstanding),
    outstanding_as_of: parseImportDate(row.outstanding_as_of),
    status: row.status || "active",
    priority: row.priority || "medium",
    last_contact_date: parseImportDate(row.last_contact_date),
    next_follow_up_date: parseImportDate(row.next_follow_up_date),
    preferred_channel: row.preferred_channel || "whatsapp",
    whatsapp_opt_in: parseBoolean(row.whatsapp_opt_in, true),
    email_opt_in: parseBoolean(row.email_opt_in, true),
    payment_followup_enabled: parseBoolean(row.payment_followup_enabled, true),
    order_received_enabled: parseBoolean(row.order_received_enabled, true),
    order_dispatch_enabled: parseBoolean(row.order_dispatch_enabled, true),
    order_delivered_enabled: parseBoolean(row.order_delivered_enabled, true),
    product_requirement_enabled: parseBoolean(row.product_requirement_enabled, true),
    billing_contact_name: row.billing_contact_name || null,
    billing_contact_phone: normalizePhoneValue(row.billing_contact_phone),
    billing_contact_email: row.billing_contact_email?.toLowerCase() || null,
    dispatch_contact_name: row.dispatch_contact_name || null,
    dispatch_contact_phone: normalizePhoneValue(row.dispatch_contact_phone),
    dispatch_contact_email: row.dispatch_contact_email?.toLowerCase() || null,
    escalation_contact_name: row.escalation_contact_name || null,
    escalation_contact_phone: normalizePhoneValue(row.escalation_contact_phone),
    escalation_contact_email: row.escalation_contact_email?.toLowerCase() || null,
    remarks: row.remarks || null
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") payload[key] = null;
  });

  return payload;
}

const employeeCsvAliases: Record<string, string> = {
  access: "app_access_status",
  access_status: "app_access_status",
  address_line: "address",
  code: "employee_code",
  contact: "phone",
  doj: "joining_date",
  doer: "full_name",
  doer_name: "full_name",
  emp_code: "employee_code",
  emp_name: "full_name",
  employee: "full_name",
  employee_id: "employee_code",
  employee_name: "full_name",
  emergency_contact: "emergency_contact_phone",
  email: "login_email",
  login: "login_email",
  manager: "reporting_manager",
  mobile: "phone",
  mobile_no: "phone",
  mobile_number: "phone",
  name: "full_name",
  personal_mail: "personal_email",
  report_to: "reporting_manager",
  reporting_to: "reporting_manager",
  team: "department",
  type: "employment_type",
  whatsapp_no: "whatsapp",
  whatsapp_number: "whatsapp",
  work_email: "login_email"
};

const employeeCsvFields = new Set([
  "employee_code",
  "full_name",
  "login_email",
  "personal_email",
  "phone",
  "whatsapp",
  "department",
  "designation",
  "role",
  "reporting_manager",
  "employment_type",
  "joining_date",
  "exit_date",
  "status",
  "app_access_status",
  "document_folder_url",
  "emergency_contact_name",
  "emergency_contact_phone",
  "address",
  "remarks"
]);

function normalizeEmployeeCsvRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = employeeCsvAliases[normalized] || normalized;
    if (employeeCsvFields.has(field)) {
      row[field] = values[index] || "";
    }
  });
  return row;
}

function employeePayloadFromCsvRow(organizationId: string, userId: string, row: Record<string, string>) {
  return {
    organization_id: organizationId,
    employee_code: row.employee_code?.trim(),
    full_name: row.full_name?.trim(),
    login_email: row.login_email?.trim().toLowerCase() || null,
    personal_email: row.personal_email?.trim().toLowerCase() || null,
    phone: normalizePhoneValue(row.phone),
    whatsapp: normalizePhoneValue(row.whatsapp),
    department: row.department?.trim() || "General",
    designation: row.designation?.trim() || null,
    role: normalizeMemberRole(row.role),
    reporting_manager: row.reporting_manager?.trim() || null,
    employment_type: normalizeEmploymentType(row.employment_type),
    joining_date: parseImportDate(row.joining_date),
    exit_date: parseImportDate(row.exit_date),
    status: normalizeEmployeeStatus(row.status),
    app_access_status: normalizeAppAccessStatus(row.app_access_status),
    document_folder_url: row.document_folder_url || null,
    emergency_contact_name: row.emergency_contact_name || null,
    emergency_contact_phone: normalizePhoneValue(row.emergency_contact_phone),
    address: row.address || null,
    remarks: row.remarks || null,
    created_by: userId
  };
}

async function hasModuleAccess(
  organizationId: string,
  moduleKey: PermissionModuleKey,
  action: "view" | "edit" = "view"
) {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("has_module_permission", {
    target_organization_id: organizationId,
    target_module_key: moduleKey,
    target_action: action
  });
  return Boolean(data);
}

async function ensureWorkspace(moduleKey?: PermissionModuleKey, action: "view" | "edit" = "view") {
  const organization = await getCurrentOrganization();
  if (!organization) {
    redirect("/dashboard/setup");
  }

  if (moduleKey && !(await hasModuleAccess(organization.id, moduleKey, action))) {
    throw new Error("You do not have access for this action.");
  }

  return organization;
}

async function ensureCanManageTeam() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/dashboard/setup");
  }

  if (!["owner", "admin"].includes(membership.role)) {
    throw new Error("Only owner or admin can create team logins.");
  }

  return membership.organization;
}

async function findAuthUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id || null;
}

export async function createWorkspace(formData: FormData) {
  const { supabase } = await requireUser();
  const name = text(formData, "name") || "Richa Global Sales";
  const gstin = text(formData, "gstin") || null;
  const stateCode = text(formData, "state_code") || "07";

  const { data, error } = await supabase.rpc("create_organization_with_owner", {
    organization_name: name,
    organization_gstin: gstin,
    organization_state_code: stateCode
  });

  if (error) {
    throw new Error(error.message);
  }

  await seedRichaData(data.id);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

async function seedRichaData(organizationId: string) {
  const { supabase, user } = await requireUser();

  const { data: existingProducts } = await supabase
    .from("products")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (existingProducts?.length) {
    return;
  }

  const { data: warehouse } = await supabase
    .from("warehouses")
    .insert({
      organization_id: organizationId,
      name: "Wazirpur Dispatch Hub",
      state_code: "07",
      address: "C-57, 3rd Floor, Wazirpur Industrial Area, Delhi"
    })
    .select("id")
    .single();

  const [{ data: mobileCategory }, { data: cctvCategory }, { data: wireCategory }] =
    await Promise.all([
      supabase
        .from("product_categories")
        .insert({ organization_id: organizationId, name: "Mobile connector pins" })
        .select("id")
        .single(),
      supabase
        .from("product_categories")
        .insert({ organization_id: organizationId, name: "CCTV/BNC components" })
        .select("id")
        .single(),
      supabase
        .from("product_categories")
        .insert({ organization_id: organizationId, name: "Premium cable wires" })
        .select("id")
        .single()
    ]);

  const { data: products } = await supabase
    .from("products")
    .insert([
      {
        organization_id: organizationId,
        category_id: mobileCategory?.id,
        sku: "PIN-TYPEC-001",
        name: "Type-C connector pin",
        hsn_sac: "8536",
        unit: "pcs",
        gst_rate: 18,
        sales_price: 4.8,
        purchase_price: 2.9,
        reorder_level: 5000
      },
      {
        organization_id: organizationId,
        category_id: cctvCategory?.id,
        sku: "BNC-CCTV-024",
        name: "CCTV BNC connector component",
        hsn_sac: "8536",
        unit: "pcs",
        gst_rate: 18,
        sales_price: 8.4,
        purchase_price: 5.1,
        reorder_level: 2500
      },
      {
        organization_id: organizationId,
        category_id: wireCategory?.id,
        sku: "WIRE-BRD-100",
        name: "Braided charging/data cable wire",
        hsn_sac: "8544",
        unit: "roll",
        gst_rate: 18,
        sales_price: 2200,
        purchase_price: 1580,
        reorder_level: 40
      }
    ])
    .select("id, sku");

  const { data: customers } = await supabase
    .from("customers")
    .insert([
      {
        organization_id: organizationId,
        name: "Mobile accessories manufacturer",
        state_code: "07",
        email: "purchase@mobile-accessories.example",
        phone: "+91 98100 00001",
        billing_address: "Delhi NCR",
        credit_limit: 500000
      },
      {
        organization_id: organizationId,
        name: "Cable assembly unit",
        state_code: "27",
        email: "orders@cable-assembly.example",
        phone: "+91 98100 00002",
        billing_address: "Maharashtra",
        credit_limit: 350000
      },
      {
        organization_id: organizationId,
        name: "CCTV distributor",
        state_code: "29",
        email: "sales@cctv-distributor.example",
        phone: "+91 98100 00003",
        billing_address: "Karnataka",
        credit_limit: 250000
      }
    ])
    .select("id, name");

  await supabase.from("vendors").insert([
    {
      organization_id: organizationId,
      name: "Overseas wire supplier",
      state_code: "96",
      email: "imports@wire-supplier.example",
      phone: "+86 000 000 000",
      billing_address: "International supplier"
    },
    {
      organization_id: organizationId,
      name: "Precision pin processing unit",
      state_code: "07",
      email: "vendor@pin-processing.example",
      phone: "+91 98100 00004",
      billing_address: "Delhi"
    }
  ]);

  if (warehouse?.id && products?.length) {
    await supabase.from("inventory_movements").insert(
      products.map((product: any) => ({
        organization_id: organizationId,
        product_id: product.id,
        warehouse_id: warehouse.id,
        movement_type: "purchase_receipt" as const,
        quantity:
          product.sku === "PIN-TYPEC-001" ? 18400 : product.sku === "BNC-CCTV-024" ? 9800 : 430,
        reference_type: "opening_stock",
        notes: "Initial Richa stock setup",
        created_by: user.id
      }))
    );
  }

  if (customers?.length) {
    await supabase.from("sales_orders").insert([
      {
        organization_id: organizationId,
        customer_id: customers[0].id,
        order_number: "SO-RGS-1007",
        status: "sent",
        subtotal: 242373,
        cgst: 21813.5,
        sgst: 21813.5,
        igst: 0,
        total: 286000
      },
      {
        organization_id: organizationId,
        customer_id: customers[1].id,
        order_number: "SO-RGS-1008",
        status: "approved",
        subtotal: 120763,
        cgst: 10868.5,
        sgst: 10868.5,
        igst: 0,
        total: 142500
      }
    ]);

    await supabase.from("invoices").insert({
      organization_id: organizationId,
      customer_id: customers[0].id,
      invoice_number: "INV-RGS-3001",
      invoice_type: "sales",
      status: "sent",
      subtotal: 242373,
      cgst: 21813.5,
      sgst: 21813.5,
      igst: 0,
      total: 286000,
      balance_due: 286000
    });
  }
}

export async function addBuyer(formData: FormData) {
  const organization = await ensureWorkspace("customers", "edit");
  const { supabase } = await requireUser();
  const clientPayload = {
    organization_id: organization.id,
    name: text(formData, "name"),
    client_code: text(formData, "client_code") || null,
    contact_person: text(formData, "contact_person") || null,
    designation: text(formData, "designation") || null,
    gstin: text(formData, "gstin") || null,
    pan: text(formData, "pan") || null,
    udyam: text(formData, "udyam") || null,
    state_code: text(formData, "state_code") || null,
    email: text(formData, "email") || null,
    phone: text(formData, "phone") || null,
    whatsapp: text(formData, "whatsapp") || null,
    alternate_phone: text(formData, "alternate_phone") || null,
    website: text(formData, "website") || null,
    client_type: text(formData, "client_type") || "buyer",
    industry: text(formData, "industry") || null,
    source: text(formData, "source") || null,
    owner_name: text(formData, "owner_name") || null,
    tally_ledger_name: text(formData, "tally_ledger_name") || null,
    tally_guid: text(formData, "tally_guid") || null,
    tally_master_id: text(formData, "tally_master_id") || null,
    tally_alter_id: text(formData, "tally_alter_id") || null,
    city: text(formData, "city") || null,
    state_name: text(formData, "state_name") || null,
    pincode: text(formData, "pincode") || null,
    country: text(formData, "country") || "India",
    billing_address: text(formData, "billing_address") || null,
    shipping_address: text(formData, "shipping_address") || null,
    credit_limit: numberValue(formData, "credit_limit"),
    credit_days: numberValue(formData, "credit_days"),
    payment_terms: text(formData, "payment_terms") || null,
    opening_outstanding: numberValue(formData, "opening_outstanding"),
    outstanding_as_of: dateValue(formData, "outstanding_as_of"),
    status: text(formData, "status") || "active",
    priority: text(formData, "priority") || "medium",
    last_contact_date: dateValue(formData, "last_contact_date"),
    next_follow_up_date: dateValue(formData, "next_follow_up_date"),
    preferred_channel: text(formData, "preferred_channel") || "whatsapp",
    whatsapp_opt_in: checkboxValue(formData, "whatsapp_opt_in"),
    email_opt_in: checkboxValue(formData, "email_opt_in"),
    payment_followup_enabled: checkboxValue(formData, "payment_followup_enabled"),
    order_received_enabled: checkboxValue(formData, "order_received_enabled"),
    order_dispatch_enabled: checkboxValue(formData, "order_dispatch_enabled"),
    order_delivered_enabled: checkboxValue(formData, "order_delivered_enabled"),
    product_requirement_enabled: checkboxValue(formData, "product_requirement_enabled"),
    billing_contact_name: text(formData, "billing_contact_name") || null,
    billing_contact_phone: text(formData, "billing_contact_phone") || null,
    billing_contact_email: text(formData, "billing_contact_email") || null,
    dispatch_contact_name: text(formData, "dispatch_contact_name") || null,
    dispatch_contact_phone: text(formData, "dispatch_contact_phone") || null,
    dispatch_contact_email: text(formData, "dispatch_contact_email") || null,
    escalation_contact_name: text(formData, "escalation_contact_name") || null,
    escalation_contact_phone: text(formData, "escalation_contact_phone") || null,
    escalation_contact_email: text(formData, "escalation_contact_email") || null,
    remarks: text(formData, "remarks") || null
  };
  const { error } = await supabase.from("customers").insert(clientPayload);

  if (error) {
    await supabase.from("customers").insert({
      organization_id: organization.id,
      name: text(formData, "name"),
      gstin: text(formData, "gstin") || null,
      state_code: text(formData, "state_code") || null,
      email: text(formData, "email") || null,
      phone: text(formData, "phone") || null,
      billing_address: text(formData, "billing_address") || null,
      credit_limit: numberValue(formData, "credit_limit")
    });
  }

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
}

export async function bulkImportClients(formData: FormData) {
  const organization = await ensureWorkspace("customers", "edit");
  const { supabase } = await requireUser();
  const csvFile = formData.get("client_csv");
  const pastedCsv = text(formData, "client_csv_text");
  const fileText =
    csvFile instanceof File && csvFile.size > 0 ? await csvFile.text() : "";
  const csvText = fileText || pastedCsv;

  if (!csvText.trim()) {
    throw new Error("CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;

  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur kam se kam ek client row honi chahiye.");
  }

  const normalizedRows = rows
    .map((row) => normalizeClientCsvRow(headers, row))
    .filter((row) => row.name?.trim());

  if (!normalizedRows.length) {
    throw new Error("CSV me company/name column nahi mila.");
  }

  for (const row of normalizedRows) {
    const payload = clientPayloadFromCsvRow(organization.id, row);
    let existingId: string | null = null;

    for (const [column, value] of [
      ["tally_guid", payload.tally_guid],
      ["client_code", payload.client_code],
      ["gstin", payload.gstin]
    ] as Array<[string, string | null]>) {
      if (!value) continue;
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("organization_id", organization.id)
        .eq(column, value)
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        existingId = data.id;
        break;
      }
    }

    if (!existingId && payload.name) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("organization_id", organization.id)
        .ilike("name", payload.name)
        .limit(1)
        .maybeSingle();
      if (data?.id) existingId = data.id;
    }

    if (existingId) {
      const { organization_id: _organizationId, ...updatePayload } = payload;
      const { error } = await supabase.from("customers").update(updatePayload).eq("id", existingId);
      if (error) throw new Error(`Client update failed: ${payload.name}`);
    } else {
      const { error } = await supabase.from("customers").insert(payload);
      if (error) throw new Error(`Client import failed: ${payload.name}`);
    }
  }

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
}

export async function addSupplier(formData: FormData) {
  const organization = await ensureWorkspace("vendors", "edit");
  const { supabase } = await requireUser();
  await supabase.from("vendors").insert({
    organization_id: organization.id,
    name: text(formData, "name"),
    gstin: text(formData, "gstin") || null,
    state_code: text(formData, "state_code") || null,
    email: text(formData, "email") || null,
    phone: text(formData, "phone") || null,
    billing_address: text(formData, "billing_address") || null
  });
  revalidatePath("/dashboard/vendors");
}

export async function addProduct(formData: FormData) {
  const organization = await ensureWorkspace("products", "edit");
  const { supabase } = await requireUser();
  await supabase.from("products").insert({
    organization_id: organization.id,
    sku: text(formData, "sku"),
    name: text(formData, "name"),
    hsn_sac: text(formData, "hsn_sac") || null,
    unit: text(formData, "unit") || "pcs",
    gst_rate: numberValue(formData, "gst_rate", 18),
    sales_price: numberValue(formData, "sales_price"),
    purchase_price: numberValue(formData, "purchase_price"),
    reorder_level: numberValue(formData, "reorder_level")
  });
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
}

const productCsvAliases: Record<string, string> = {
  buying_rate: "purchase_price",
  cost: "purchase_price",
  cost_price: "purchase_price",
  gst: "gst_rate",
  gst_percent: "gst_rate",
  gst_percentage: "gst_rate",
  hsn: "hsn_sac",
  hsn_code: "hsn_sac",
  hsn_sac_code: "hsn_sac",
  item: "name",
  item_code: "sku",
  item_name: "name",
  minimum_stock: "reorder_level",
  mrp: "sales_price",
  price: "sales_price",
  product: "name",
  product_code: "sku",
  product_name: "name",
  purchase_rate: "purchase_price",
  purchase_price_inr: "purchase_price",
  rate: "sales_price",
  reorder: "reorder_level",
  sale_rate: "sales_price",
  sales_rate: "sales_price",
  sales_price_inr: "sales_price",
  selling_price: "sales_price",
  selling_rate: "sales_price",
  sku_code: "sku",
  stock_alert: "reorder_level",
  stock_alert_level: "reorder_level",
  uom: "unit",
  unit_name: "unit"
};

function normalizeProductCsvRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = productCsvAliases[normalized] || normalized;
    row[field] = values[index] || "";
  });
  return row;
}

export async function bulkImportProducts(formData: FormData) {
  const organization = await ensureWorkspace("products", "edit");
  const { supabase } = await requireUser();
  const csvFile = formData.get("product_csv");
  const pastedCsv = text(formData, "product_csv_text");
  const fileText = csvFile instanceof File && csvFile.size > 0 ? await csvFile.text() : "";
  const csvText = fileText || pastedCsv;

  if (!csvText.trim()) {
    throw new Error("Product Master CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur product rows required hain.");
  }

  const payload = rows
    .map((rawRow) => normalizeProductCsvRow(headers, rawRow))
    .map((row) => {
      const name = (row.name || row.product_name || "").trim();
      const generatedSku =
        (row.sku || row.item_code || name)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 48) || "";

      if (!generatedSku || !name) return null;

      return {
        organization_id: organization.id,
        sku: generatedSku,
        name,
        hsn_sac: row.hsn_sac || null,
        unit: row.unit || "pcs",
        gst_rate: parseNumber(row.gst_rate, 18),
        sales_price: parseNumber(row.sales_price),
        purchase_price: parseNumber(row.purchase_price),
        reorder_level: parseNumber(row.reorder_level),
        updated_at: new Date().toISOString()
      };
    })
    .filter(Boolean);

  if (!payload.length) {
    throw new Error("CSV me valid SKU aur item name rows nahi mile.");
  }

  const { error } = await supabase
    .from("products")
    .upsert(payload, { onConflict: "organization_id,sku" });

  if (error) {
    throw new Error(`Product Master import failed: ${error.message}`);
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/purchases");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
}

export async function addWarehouse(formData: FormData) {
  const organization = await ensureWorkspace("inventory", "edit");
  const { supabase } = await requireUser();
  await supabase.from("warehouses").insert({
    organization_id: organization.id,
    name: text(formData, "name"),
    state_code: text(formData, "state_code") || null,
    address: text(formData, "address") || null
  });
  revalidatePath("/dashboard/inventory");
}

export async function addInventoryMovement(formData: FormData) {
  const organization = await ensureWorkspace("inventory", "edit");
  const { supabase, user } = await requireUser();

  let warehouseId = text(formData, "warehouse_id");
  if (!warehouseId) {
    const { data: warehouse } = await supabase
      .from("warehouses")
      .insert({
        organization_id: organization.id,
        name: "Wazirpur Dispatch Hub",
        state_code: "07",
        address: "C-57, 3rd Floor, Wazirpur Industrial Area, Delhi"
      })
      .select("id")
      .single();
    warehouseId = warehouse?.id || "";
  }

  await supabase.from("inventory_movements").insert({
    organization_id: organization.id,
    product_id: text(formData, "product_id"),
    warehouse_id: warehouseId,
    movement_type: text(formData, "movement_type") as "purchase_receipt" | "sale_issue" | "adjustment" | "transfer",
    quantity: numberValue(formData, "quantity"),
    reference_type: text(formData, "reference_type") || null,
    notes: text(formData, "notes") || null,
    created_by: user.id
  });
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard");
}

type InventoryImportProduct = {
  id: string;
  sku: string;
  name: string;
};

type InventoryImportWarehouse = {
  id: string;
  name: string;
};

function normalizeInventoryMovementType(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (["out", "issue", "sale", "sales", "sale_issue", "dispatch", "stock_out"].includes(normalized)) {
    return "sale_issue";
  }
  if (["adjust", "adjustment", "stock_adjustment"].includes(normalized)) return "adjustment";
  if (["transfer", "stock_transfer"].includes(normalized)) return "transfer";
  return "purchase_receipt";
}

const inventoryCsvAliases: Record<string, string> = {
  godown: "warehouse",
  godown_name: "warehouse",
  item: "product_name",
  item_code: "sku",
  item_name: "product_name",
  location: "warehouse",
  movement: "movement_type",
  product: "product_name",
  product_code: "sku",
  product_name: "product_name",
  qty: "quantity",
  ref: "reference_type",
  reference: "reference_type",
  remarks: "notes",
  sku_code: "sku",
  stock: "quantity",
  type: "movement_type",
  warehouse_name: "warehouse"
};

function normalizeInventoryCsvRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = inventoryCsvAliases[normalized] || normalized;
    row[field] = values[index] || "";
  });
  return row;
}

export async function bulkImportInventory(formData: FormData) {
  const organization = await ensureWorkspace("inventory", "edit");
  const { supabase, user } = await requireUser();
  const csvFile = formData.get("inventory_csv");
  const pastedCsv = text(formData, "inventory_csv_text");
  const fileText =
    csvFile instanceof File && csvFile.size > 0 ? await csvFile.text() : "";
  const csvText = fileText || pastedCsv;

  if (!csvText.trim()) {
    throw new Error("Inventory CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur stock rows required hain.");
  }

  const [{ data: products }, { data: warehouses }] = await Promise.all([
    supabase.from("products").select("id, sku, name").eq("organization_id", organization.id),
    supabase.from("warehouses").select("id, name").eq("organization_id", organization.id)
  ]);
  const productCache = new Map<string, InventoryImportProduct>();
  const warehouseCache = new Map<string, InventoryImportWarehouse>();

  for (const product of (products || []) as InventoryImportProduct[]) {
    productCache.set(product.sku.toLowerCase(), product);
    productCache.set(product.name.toLowerCase(), product);
  }
  for (const warehouse of (warehouses || []) as InventoryImportWarehouse[]) {
    warehouseCache.set(warehouse.name.toLowerCase(), warehouse);
  }

  for (const rawRow of rows) {
    const row = normalizeInventoryCsvRow(headers, rawRow);
    const sku = row.sku?.trim();
    const productName = row.product_name?.trim() || sku;
    const warehouseName = row.warehouse?.trim() || "Main Godown";
    const quantity = parseNumber(row.quantity);

    if (!productName || !quantity) continue;

    let product =
      (sku ? productCache.get(sku.toLowerCase()) : null) ||
      productCache.get(productName.toLowerCase());

    if (!product) {
      const generatedSku =
        sku ||
        productName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40);
      const { data, error } = await supabase
        .from("products")
        .insert({
          organization_id: organization.id,
          sku: generatedSku,
          name: productName,
          unit: row.unit || "pcs",
          hsn_sac: row.hsn_sac || null,
          gst_rate: parseNumber(row.gst_rate, 18),
          sales_price: parseNumber(row.sales_price),
          purchase_price: parseNumber(row.purchase_price),
          reorder_level: parseNumber(row.reorder_level)
        })
        .select("id, sku, name")
        .single();
      if (error || !data) throw new Error(`Product create failed: ${productName}`);
      product = data as InventoryImportProduct;
      productCache.set(product.sku.toLowerCase(), product);
      productCache.set(product.name.toLowerCase(), product);
    }

    let warehouse = warehouseCache.get(warehouseName.toLowerCase());
    if (!warehouse) {
      const { data, error } = await supabase
        .from("warehouses")
        .insert({
          organization_id: organization.id,
          name: warehouseName,
          state_code: row.state_code || null,
          address: row.address || null
        })
        .select("id, name")
        .single();
      if (error || !data) throw new Error(`Godown create failed: ${warehouseName}`);
      warehouse = data as InventoryImportWarehouse;
      warehouseCache.set(warehouse.name.toLowerCase(), warehouse);
    }

    const { error } = await supabase.from("inventory_movements").insert({
      organization_id: organization.id,
      product_id: product.id,
      warehouse_id: warehouse.id,
      movement_type: normalizeInventoryMovementType(row.movement_type),
      quantity,
      reference_type: row.reference_type || "bulk_import",
      notes: row.notes || null,
      created_by: user.id
    });
    if (error) throw new Error(`Inventory import failed: ${productName} / ${warehouseName}`);
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
}

type OrderImportCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type OrderImportProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  gst_rate: number;
  sales_price: number;
  purchase_price?: number;
};

type PurchaseImportVendor = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

const orderCsvAliases: Record<string, string> = {
  bill_no: "order_number",
  buyer: "customer_name",
  customer: "customer_name",
  customer_name: "customer_name",
  delivery: "delivery_date",
  delivery_date: "delivery_date",
  doer: "sales_executive",
  dispatch: "dispatch_status",
  dispatch_image: "dispatch_proof_url",
  dispatch_location_image: "dispatch_location_url",
  dispatch_quantity: "dispatch_quantity",
  dispatch_status: "dispatch_status",
  executive: "sales_executive",
  feedback: "feedback_status",
  feedback_status: "feedback_status",
  invoice_link: "invoice_proof_url",
  invoice_image: "invoice_proof_url",
  invoice_status: "billing_status",
  item: "product_name",
  item_name: "product_name",
  order: "order_number",
  order_date: "order_date",
  order_no: "order_number",
  order_number: "order_number",
  order_image: "order_proof_url",
  order_proof: "order_proof_url",
  party: "customer_name",
  party_name: "customer_name",
  pending_order: "pending_order",
  po: "po_url",
  po_image: "po_url",
  product: "product_name",
  product_code: "sku",
  product_name: "product_name",
  qty: "quantity",
  return_quantity: "return_quantity",
  rate: "unit_price",
  remarks: "remarks",
  sales_person: "sales_executive",
  salesperson: "sales_executive",
  sku: "sku",
  sku_code: "sku",
  stock: "stock_status",
  stock_status: "stock_status",
  total: "total",
  total_quantity: "quantity",
  value: "total",
  vendor_customer: "customer_name",
  vendor_name: "customer_name"
};

function normalizeOrderCsvRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = orderCsvAliases[normalized] || normalized;
    row[field] = values[index] || "";
  });
  return row;
}

function normalizeFlowStatus(value: unknown, fallback = "pending") {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (!normalized) return fallback;
  if (["done", "complete", "completed", "yes", "ok", "closed", "delivered", "billed", "dispatched"].includes(normalized)) {
    return "done";
  }
  if (["hold", "on_hold", "blocked", "issue"].includes(normalized)) return "blocked";
  if (["not_required", "na", "n_a"].includes(normalized)) return "not_required";
  if (["working", "progress", "in_progress", "process"].includes(normalized)) return "in_progress";
  return normalized;
}

function flowStatusFromFms(value: unknown) {
  const status = normalizeFlowStatus(value);
  return status === "-" ? "pending" : status;
}

function fmsStagePayload(entry: {
  overdueStatus?: string;
  overduePlanned?: string;
  overdueActual?: string;
  overdueDelay?: string;
  overdueDoer?: string;
  stockStatus?: string;
  stockPlanned?: string;
  stockActual?: string;
  stockDelay?: string;
  stockDoer?: string;
  dispatchStatus?: string;
  dispatchPlanned?: string;
  dispatchActual?: string;
  dispatchDelay?: string;
  dispatchDoer?: string;
  billingStatus?: string;
  billingPlanned?: string;
  billingActual?: string;
  billingDelay?: string;
  billingDoer?: string;
  feedbackStatus?: string;
  feedbackPlanned?: string;
  feedbackActual?: string;
  feedbackDelay?: string;
}) {
  return {
    payment_overdue: {
      status: entry.overdueStatus || "",
      planned: entry.overduePlanned || "",
      actual: entry.overdueActual || "",
      delay: entry.overdueDelay || "",
      doer: entry.overdueDoer || ""
    },
    stock_check: {
      status: entry.stockStatus || "",
      planned: entry.stockPlanned || "",
      actual: entry.stockActual || "",
      delay: entry.stockDelay || "",
      doer: entry.stockDoer || ""
    },
    dispatch: {
      status: entry.dispatchStatus || "",
      planned: entry.dispatchPlanned || "",
      actual: entry.dispatchActual || "",
      delay: entry.dispatchDelay || "",
      doer: entry.dispatchDoer || ""
    },
    billing: {
      status: entry.billingStatus || "",
      planned: entry.billingPlanned || "",
      actual: entry.billingActual || "",
      delay: entry.billingDelay || "",
      doer: entry.billingDoer || ""
    },
    feedback: {
      status: entry.feedbackStatus || "",
      planned: entry.feedbackPlanned || "",
      actual: entry.feedbackActual || "",
      delay: entry.feedbackDelay || ""
    }
  };
}

function calculateOrderTotals(quantity: number, unitPrice: number, gstRate: number, totalOverride = 0) {
  if (totalOverride > 0) {
    const taxable = Math.round((totalOverride / (1 + gstRate / 100)) * 100) / 100;
    const taxHalf = Math.round(((totalOverride - taxable) / 2) * 100) / 100;
    return {
      subtotal: taxable,
      cgst: taxHalf,
      sgst: taxHalf,
      igst: 0,
      total: totalOverride,
      lineTotal: taxable
    };
  }

  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
  const tax = Math.round(lineTotal * (gstRate / 100) * 100) / 100;
  const taxHalf = Math.round((tax / 2) * 100) / 100;
  return {
    subtotal: lineTotal,
    cgst: taxHalf,
    sgst: taxHalf,
    igst: 0,
    total: lineTotal + tax,
    lineTotal
  };
}

async function ensureOrderCustomer(
  supabase: any,
  organizationId: string,
  cache: Map<string, OrderImportCustomer>,
  name: string,
  phone?: string | null,
  email?: string | null
) {
  const customerName = name.trim();
  const key = customerName.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: organizationId,
      name: customerName,
      phone: normalizePhoneValue(phone),
      whatsapp: normalizePhoneValue(phone),
      email: email?.toLowerCase() || null
    })
    .select("id, name, phone, email")
    .single();

  if (error || !data) throw new Error(`Client create failed: ${customerName}`);
  const customer = data as OrderImportCustomer;
  cache.set(key, customer);
  return customer;
}

async function ensureOrderProduct(
  supabase: any,
  organizationId: string,
  cache: Map<string, OrderImportProduct>,
  sku: string,
  name: string,
  unit = "pcs",
  unitPrice = 0
) {
  const productName = name.trim() || sku.trim();
  const generatedSku =
    sku.trim() ||
    productName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  const cached = cache.get(generatedSku.toLowerCase()) || cache.get(productName.toLowerCase());
  if (cached) return cached;

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      sku: generatedSku,
      name: productName,
      unit: unit || "pcs",
      gst_rate: 18,
      sales_price: unitPrice
    })
    .select("id, sku, name, unit, gst_rate, sales_price")
    .single();

  if (error || !data) throw new Error(`Product create failed: ${productName}`);
  const product = data as OrderImportProduct;
  cache.set(product.sku.toLowerCase(), product);
  cache.set(product.name.toLowerCase(), product);
  return product;
}

async function upsertOrderItem(
  supabase: any,
  organizationId: string,
  orderId: string,
  product: OrderImportProduct,
  quantity: number,
  unitPrice: number,
  lineTotal: number
) {
  const { data: existing } = await supabase
    .from("sales_order_items")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("sales_order_id", orderId)
    .eq("product_id", product.id)
    .limit(1)
    .maybeSingle();

  const payload = {
    sales_order_id: orderId,
    organization_id: organizationId,
    product_id: product.id,
    quantity,
    unit_price: unitPrice,
    gst_rate: Number(product.gst_rate || 18),
    line_total: lineTotal
  };

  const query = existing?.id
    ? supabase.from("sales_order_items").update(payload).eq("id", existing.id)
    : supabase.from("sales_order_items").insert(payload);

  const { error } = await query;
  if (error) throw new Error(`Order item save failed: ${product.name}`);
}

async function ensurePurchaseVendor(
  supabase: any,
  organizationId: string,
  cache: Map<string, PurchaseImportVendor>,
  name: string,
  phone?: string | null,
  email?: string | null
) {
  const vendorName = name.trim();
  const key = vendorName.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const { data: existing } = await supabase
    .from("vendors")
    .select("id, name, phone, email")
    .eq("organization_id", organizationId)
    .ilike("name", vendorName)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const vendor = existing as PurchaseImportVendor;
    cache.set(key, vendor);
    return vendor;
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      organization_id: organizationId,
      name: vendorName,
      phone: normalizePhoneValue(phone),
      email: email?.toLowerCase() || null
    })
    .select("id, name, phone, email")
    .single();

  if (error || !data) throw new Error(`Supplier create failed: ${vendorName}`);
  const vendor = data as PurchaseImportVendor;
  cache.set(key, vendor);
  return vendor;
}

async function ensurePurchaseProduct(
  supabase: any,
  organizationId: string,
  cache: Map<string, OrderImportProduct>,
  sku: string,
  name: string,
  unit = "pcs",
  unitPrice = 0
) {
  const productName = name.trim() || sku.trim();
  const generatedSku =
    sku.trim() ||
    productName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  const cached = cache.get(generatedSku.toLowerCase()) || cache.get(productName.toLowerCase());
  if (cached) return cached;

  let existing: OrderImportProduct | null = null;
  const { data: existingBySku } = await supabase
    .from("products")
    .select("id, sku, name, unit, gst_rate, sales_price, purchase_price")
    .eq("organization_id", organizationId)
    .ilike("sku", generatedSku)
    .limit(1)
    .maybeSingle();

  if (existingBySku) {
    existing = existingBySku as OrderImportProduct;
  } else {
    const { data: existingByName } = await supabase
      .from("products")
      .select("id, sku, name, unit, gst_rate, sales_price, purchase_price")
      .eq("organization_id", organizationId)
      .ilike("name", productName)
      .limit(1)
      .maybeSingle();
    existing = existingByName as OrderImportProduct | null;
  }

  if (existing) {
    cache.set(existing.sku.toLowerCase(), existing);
    cache.set(existing.name.toLowerCase(), existing);
    return existing;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      sku: generatedSku,
      name: productName,
      unit: unit || "pcs",
      gst_rate: 18,
      purchase_price: unitPrice
    })
    .select("id, sku, name, unit, gst_rate, sales_price, purchase_price")
    .single();

  if (error || !data) throw new Error(`Product create failed: ${productName}`);
  const product = data as OrderImportProduct;
  cache.set(product.sku.toLowerCase(), product);
  cache.set(product.name.toLowerCase(), product);
  return product;
}

async function upsertPurchaseItem(
  supabase: any,
  organizationId: string,
  orderId: string,
  product: OrderImportProduct,
  quantity: number,
  unitPrice: number,
  lineTotal: number
) {
  const { data: existing } = await supabase
    .from("purchase_order_items")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("purchase_order_id", orderId)
    .eq("product_id", product.id)
    .limit(1)
    .maybeSingle();

  const payload = {
    purchase_order_id: orderId,
    organization_id: organizationId,
    product_id: product.id,
    quantity,
    unit_price: unitPrice,
    gst_rate: Number(product.gst_rate || 18),
    line_total: lineTotal
  };

  const query = existing?.id
    ? supabase.from("purchase_order_items").update(payload).eq("id", existing.id)
    : supabase.from("purchase_order_items").insert(payload);

  const { error } = await query;
  if (error) throw new Error(`Purchase item save failed: ${product.name}`);
}

export async function createPurchaseOrderPunch(formData: FormData) {
  const organization = await ensureWorkspace("purchases", "edit");
  const { supabase } = await requireUser();
  const membership = await getCurrentMembership();
  const canEditRate = ["owner", "admin"].includes(membership?.role || "");
  const productId = text(formData, "product_id");
  const quantity = numberValue(formData, "quantity", 1);
  const orderTotal = canEditRate ? numberValue(formData, "total") : 0;

  const { data: product } = await supabase
    .from("products")
    .select("id, sku, name, unit, gst_rate, sales_price, purchase_price")
    .eq("organization_id", organization.id)
    .eq("id", productId)
    .single();

  if (!product) {
    throw new Error("Product master required hai. Pehle SKU add karo ya bulk upload use karo.");
  }

  const masterRate = Number(product.purchase_price || 0);
  const unitPrice = canEditRate ? numberValue(formData, "unit_price", masterRate) : masterRate;
  const totals = calculateOrderTotals(quantity, unitPrice, Number(product.gst_rate || 18), orderTotal);
  const orderNumber = text(formData, "order_number") || `PO-${Date.now().toString().slice(-6)}`;

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: organization.id,
      vendor_id: text(formData, "vendor_id"),
      order_number: orderNumber,
      status: "sent",
      order_date: dateValue(formData, "order_date") || undefined,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      total: totals.total
    })
    .select("id")
    .single();

  if (error || !order) throw new Error(error?.message || "Purchase order punch failed.");

  await upsertPurchaseItem(supabase, organization.id, order.id, product as OrderImportProduct, quantity, unitPrice, totals.lineTotal);

  revalidatePath("/dashboard/purchases");
  revalidatePath("/dashboard");
}

const purchaseCsvAliases: Record<string, string> = {
  item: "product_name",
  item_name: "product_name",
  po: "order_number",
  po_no: "order_number",
  po_number: "order_number",
  product: "product_name",
  product_code: "sku",
  product_name: "product_name",
  purchase_price: "unit_price",
  qty: "quantity",
  rate: "unit_price",
  sku: "sku",
  sku_code: "sku",
  supplier: "vendor_name",
  supplier_name: "vendor_name",
  total: "total",
  unit: "unit",
  vendor: "vendor_name",
  vendor_name: "vendor_name"
};

function normalizePurchaseCsvRow(headers: string[], values: string[]) {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = purchaseCsvAliases[normalized] || normalized;
    row[field] = values[index] || "";
  });
  return row;
}

export async function bulkImportPurchaseOrders(formData: FormData) {
  const organization = await ensureWorkspace("purchases", "edit");
  const { supabase } = await requireUser();
  const csvFile = formData.get("purchase_csv");
  const pastedCsv = text(formData, "purchase_csv_text");
  const fileText = csvFile instanceof File && csvFile.size > 0 ? await csvFile.text() : "";
  const csvText = fileText || pastedCsv;

  if (!csvText.trim()) {
    throw new Error("Purchase CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur purchase rows required hain.");
  }

  const [{ data: vendors }, { data: products }] = await Promise.all([
    supabase.from("vendors").select("id, name, phone, email").eq("organization_id", organization.id),
    supabase.from("products").select("id, sku, name, unit, gst_rate, sales_price, purchase_price").eq("organization_id", organization.id)
  ]);

  const vendorCache = new Map<string, PurchaseImportVendor>();
  for (const vendor of (vendors || []) as PurchaseImportVendor[]) {
    vendorCache.set(vendor.name.toLowerCase(), vendor);
  }

  const productCache = new Map<string, OrderImportProduct>();
  for (const product of (products || []) as OrderImportProduct[]) {
    productCache.set(product.sku.toLowerCase(), product);
    productCache.set(product.name.toLowerCase(), product);
  }

  for (const rawRow of rows) {
    const row = normalizePurchaseCsvRow(headers, rawRow);
    const vendorName = row.vendor_name?.trim();
    const productName = row.product_name?.trim();
    const sku = row.sku?.trim();
    if (!vendorName || (!productName && !sku)) continue;

    const vendor = await ensurePurchaseVendor(supabase, organization.id, vendorCache, vendorName, row.phone, row.email);
    const quantity = parseNumber(row.quantity || row.qty, 1);
    const csvUnitPrice = parseNumber(row.unit_price || row.rate || row.purchase_price, 0);
    const product = await ensurePurchaseProduct(
      supabase,
      organization.id,
      productCache,
      sku,
      productName || sku,
      row.unit || "pcs",
      csvUnitPrice
    );
    const unitPrice = csvUnitPrice || Number(product.purchase_price || 0);
    const total = parseNumber(row.total || row.value, 0);
    const totals = calculateOrderTotals(quantity, unitPrice, Number(product.gst_rate || 18), total);
    const orderNumber = row.order_number?.trim() || `PO-${Date.now().toString().slice(-6)}`;

    const { data: existingOrder } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("order_number", orderNumber)
      .limit(1)
      .maybeSingle();

    const payload = {
      organization_id: organization.id,
      vendor_id: vendor.id,
      order_number: orderNumber,
      status: normalizeFlowStatus(row.status || "sent", "sent"),
      order_date: parseImportDate(row.order_date || row.date) || undefined,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      total: totals.total
    };

    const query = existingOrder?.id
      ? supabase.from("purchase_orders").update(payload).eq("id", existingOrder.id).select("id").single()
      : supabase.from("purchase_orders").insert(payload).select("id").single();

    const { data: order, error } = await query;
    if (error || !order) throw new Error(`Purchase order save failed: ${orderNumber}`);
    await upsertPurchaseItem(supabase, organization.id, order.id, product, quantity, unitPrice, totals.lineTotal);
  }

  revalidatePath("/dashboard/purchases");
  revalidatePath("/dashboard");
}

export async function createOrderPunch(formData: FormData) {
  const organization = await ensureWorkspace("sales", "edit");
  const { supabase } = await requireUser();
  const membership = await getCurrentMembership();
  const canEditRate = ["owner", "admin"].includes(membership?.role || "");
  const productId = text(formData, "product_id");
  const quantity = numberValue(formData, "quantity", 1);
  const orderTotal = canEditRate ? numberValue(formData, "total") : 0;
  const submittedOrderNumber = text(formData, "order_number");

  const { data: product } = await supabase
    .from("products")
    .select("id, sku, name, unit, gst_rate, sales_price")
    .eq("organization_id", organization.id)
    .eq("id", productId)
    .single();

  if (!product) {
    throw new Error("Product master required hai. Pehle product add karo ya bulk upload use karo.");
  }

  const masterRate = Number(product.sales_price || 0);
  const unitPrice = canEditRate ? numberValue(formData, "unit_price", masterRate) : masterRate;
  const totals = calculateOrderTotals(quantity, unitPrice, Number(product.gst_rate || 18), orderTotal);
  const orderNumber = submittedOrderNumber || `ORD-${Date.now().toString().slice(-6)}`;

  const { data: order, error } = await supabase
    .from("sales_orders")
    .insert({
      organization_id: organization.id,
      customer_id: text(formData, "customer_id"),
      order_number: orderNumber,
      status: "sent",
      order_date: dateValue(formData, "order_date") || undefined,
      delivery_date: dateValue(formData, "delivery_date"),
      sales_executive: text(formData, "sales_executive") || null,
      order_source: text(formData, "order_source") || "ERP manual",
      priority: text(formData, "priority") || "medium",
      payment_check_status: "pending",
      stock_status: "pending",
      dispatch_status: "pending",
      billing_status: "pending",
      delivery_status: "pending",
      feedback_status: "pending",
      order_proof_url: text(formData, "order_proof_url") || null,
      po_url: text(formData, "po_url") || null,
      remarks: text(formData, "remarks") || null,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      total: totals.total
    })
    .select("id")
    .single();

  if (error || !order) throw new Error(error?.message || "Order punch failed.");

  await upsertOrderItem(supabase, organization.id, order.id, product as OrderImportProduct, quantity, unitPrice, totals.lineTotal);

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
}

export async function bulkImportOrders(formData: FormData) {
  const organization = await ensureWorkspace("sales", "edit");
  const { supabase } = await requireUser();
  const csvFile = formData.get("orders_csv");
  const pastedCsv = text(formData, "orders_csv_text");
  const fileText =
    csvFile instanceof File && csvFile.size > 0 ? await csvFile.text() : "";
  const csvText = fileText || pastedCsv;

  if (!csvText.trim()) {
    throw new Error("Order CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur order rows required hain.");
  }

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase.from("customers").select("id, name, phone, email").eq("organization_id", organization.id),
    supabase.from("products").select("id, sku, name, unit, gst_rate, sales_price").eq("organization_id", organization.id)
  ]);
  const customerCache = new Map<string, OrderImportCustomer>();
  const productCache = new Map<string, OrderImportProduct>();

  for (const customer of (customers || []) as OrderImportCustomer[]) {
    customerCache.set(customer.name.toLowerCase(), customer);
  }
  for (const product of (products || []) as OrderImportProduct[]) {
    productCache.set(product.sku.toLowerCase(), product);
    productCache.set(product.name.toLowerCase(), product);
  }

  for (const rawRow of rows) {
    const row = normalizeOrderCsvRow(headers, rawRow);
    const orderNumber = row.order_number?.trim();
    const customerName = row.customer_name?.trim();
    const quantity = parseNumber(row.quantity, 1);
    if (!orderNumber || !customerName) continue;

    const customer =
      customerCache.get(customerName.toLowerCase()) ||
      (await ensureOrderCustomer(supabase, organization.id, customerCache, customerName, row.phone, row.email));
    const product = await ensureOrderProduct(
      supabase,
      organization.id,
      productCache,
      row.sku || "",
      row.product_name || row.item_name || "Order item",
      row.unit || "pcs",
      parseNumber(row.unit_price || row.rate)
    );
    const unitPrice = parseNumber(row.unit_price || row.rate, Number(product.sales_price || 0));
    const totals = calculateOrderTotals(quantity, unitPrice, Number(product.gst_rate || 18), parseNumber(row.total));

    const { data: order, error } = await supabase
      .from("sales_orders")
      .upsert(
        {
          organization_id: organization.id,
          customer_id: customer.id,
          order_number: orderNumber,
          status: "sent",
          order_date: parseImportDate(row.order_date) || undefined,
          delivery_date: parseImportDate(row.delivery_date),
          sales_executive: row.sales_executive || null,
          order_source: row.order_source || "bulk_import",
          priority: row.priority || "medium",
          payment_check_status: normalizeFlowStatus(row.payment_check_status || row.overdue_status || row.status),
          stock_status: normalizeFlowStatus(row.stock_status),
          dispatch_status: normalizeFlowStatus(row.dispatch_status),
          billing_status: normalizeFlowStatus(row.billing_status),
          delivery_status: normalizeFlowStatus(row.delivery_status),
          feedback_status: normalizeFlowStatus(row.feedback_status),
          order_proof_url: row.order_proof_url || null,
          dispatch_proof_url: row.dispatch_proof_url || null,
          invoice_proof_url: row.invoice_proof_url || null,
          po_url: row.po_url || null,
          remarks: row.remarks || null,
          fms_synced_at: new Date().toISOString(),
          subtotal: totals.subtotal,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          total: totals.total
        },
        { onConflict: "organization_id,order_number" }
      )
      .select("id")
      .single();

    if (error || !order) throw new Error(`Order import failed: ${orderNumber}`);
    await upsertOrderItem(supabase, organization.id, order.id, product, quantity, unitPrice, totals.lineTotal);
  }

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
}

export async function importOrderDeliveryFromLinkedSheet() {
  const organization = await ensureWorkspace("sales", "edit");
  const { supabase } = await requireUser();
  const response = await fetch(orderDeliverySheetUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Order to Delivery Google Sheet CSV accessible nahi hai.");
  }

  const csv = await response.text();
  const feed = parseOrderDeliveryCsv(csv);

  if (feed.mode !== "orders" || !feed.entries.length) {
    throw new Error(feed.error || "Order response rows nahi mile.");
  }

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase.from("customers").select("id, name, phone, email").eq("organization_id", organization.id),
    supabase.from("products").select("id, sku, name, unit, gst_rate, sales_price").eq("organization_id", organization.id)
  ]);
  const customerCache = new Map<string, OrderImportCustomer>();
  const productCache = new Map<string, OrderImportProduct>();

  for (const customer of (customers || []) as OrderImportCustomer[]) {
    customerCache.set(customer.name.toLowerCase(), customer);
  }
  for (const product of (products || []) as OrderImportProduct[]) {
    productCache.set(product.sku.toLowerCase(), product);
    productCache.set(product.name.toLowerCase(), product);
  }

  for (const entry of feed.entries) {
    const orderNumber = entry.orderNumber?.trim();
    const customerName = entry.vendorName?.trim();
    if (!orderNumber || orderNumber === "-" || !customerName || customerName === "-") continue;

    const quantity = parseNumber(entry.qty, 1);
    const total = parseNumber(entry.estimateNo);
    const customer =
      customerCache.get(customerName.toLowerCase()) ||
      (await ensureOrderCustomer(supabase, organization.id, customerCache, customerName));
    const product = await ensureOrderProduct(
      supabase,
      organization.id,
      productCache,
      entry.sku === "-" ? "" : entry.sku,
      entry.itemName === "-" ? "Order item" : entry.itemName,
      entry.unit === "-" ? "pcs" : entry.unit
    );
    const unitPrice = total > 0 && quantity > 0 ? Math.round((total / quantity) * 100) / 100 : Number(product.sales_price || 0);
    const totals = calculateOrderTotals(quantity, unitPrice, Number(product.gst_rate || 18), total);

    const { data: order, error } = await supabase
      .from("sales_orders")
      .upsert(
        {
          organization_id: organization.id,
          customer_id: customer.id,
          order_number: orderNumber,
          status: "sent",
          order_date: parseImportDate(entry.timestamp) || undefined,
          delivery_date: parseImportDate(entry.deliveryDate),
          sales_executive: entry.salesExecutive !== "-" ? entry.salesExecutive : null,
          order_source: "google_sheet_fms",
          priority: entry.overdueDelay !== "-" || entry.stockDelay !== "-" ? "high" : "medium",
          payment_check_status: flowStatusFromFms(entry.overdueStatus),
          stock_status: flowStatusFromFms(entry.stockStatus),
          dispatch_status: flowStatusFromFms(entry.dispatchStatus),
          billing_status: flowStatusFromFms(entry.billingStatus),
          delivery_status: flowStatusFromFms(entry.feedbackStatus) === "done" ? "done" : "pending",
          feedback_status: flowStatusFromFms(entry.feedbackStatus),
          order_proof_url: entry.imageUrl !== "-" ? entry.imageUrl : null,
          dispatch_proof_url: entry.dispatchImageUrl !== "-" ? entry.dispatchImageUrl : null,
          invoice_proof_url: entry.invoiceImageUrl !== "-" ? entry.invoiceImageUrl : null,
          po_url: entry.poImageUrl !== "-" ? entry.poImageUrl : null,
          remarks: [entry.pendingOrder !== "-" ? `Pending: ${entry.pendingOrder}` : "", entry.returnQuantity !== "-" ? `Return: ${entry.returnQuantity}` : ""]
            .filter(Boolean)
            .join(" | ") || null,
          fms_stage_payload: fmsStagePayload(entry),
          fms_synced_at: new Date().toISOString(),
          subtotal: totals.subtotal,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          total: totals.total
        },
        { onConflict: "organization_id,order_number" }
      )
      .select("id")
      .single();

    if (error || !order) throw new Error(`FMS import failed: ${orderNumber}`);
    await upsertOrderItem(supabase, organization.id, order.id, product, quantity, unitPrice, totals.lineTotal);
  }

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
}

export async function updateOrderDeliveryFlow(formData: FormData) {
  const organization = await ensureWorkspace("sales", "edit");
  const { supabase } = await requireUser();
  const orderId = text(formData, "order_id");

  if (!orderId) return;

  const { error } = await supabase
    .from("sales_orders")
    .update({
      payment_check_status: normalizeFlowStatus(text(formData, "payment_check_status")),
      stock_status: normalizeFlowStatus(text(formData, "stock_status")),
      dispatch_status: normalizeFlowStatus(text(formData, "dispatch_status")),
      billing_status: normalizeFlowStatus(text(formData, "billing_status")),
      delivery_status: normalizeFlowStatus(text(formData, "delivery_status")),
      feedback_status: normalizeFlowStatus(text(formData, "feedback_status")),
      dispatch_proof_url: text(formData, "dispatch_proof_url") || null,
      invoice_proof_url: text(formData, "invoice_proof_url") || null,
      remarks: text(formData, "remarks") || null
    })
    .eq("organization_id", organization.id)
    .eq("id", orderId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
}

function checklistPermissionModule(departmentKey: ChecklistDepartmentKey): PermissionModuleKey {
  return checklistDepartments[departmentKey].module as PermissionModuleKey;
}

export async function addDepartmentChecklist(formData: FormData) {
  const departmentKey = normalizeChecklistDepartment(text(formData, "department_key"));
  const organization = await ensureWorkspace(checklistPermissionModule(departmentKey), "edit");
  const { supabase, user } = await requireUser();
  const title = text(formData, "title");

  if (!title) {
    throw new Error("Checklist task title required hai.");
  }

  const checklistCode =
    text(formData, "checklist_code") ||
    (await nextTaskCode(supabase, "department_checklists", "checklist_code", organization.id));

  const { error } = await supabase.from("department_checklists").insert({
    organization_id: organization.id,
    department_key: departmentKey,
    checklist_code: checklistCode,
    title,
    description: text(formData, "description") || null,
    owner_name: text(formData, "owner_name") || null,
    frequency: normalizeChecklistFrequency(text(formData, "frequency")),
    priority: normalizeChecklistPriority(text(formData, "priority")),
    due_date: dateValue(formData, "due_date"),
    status: normalizeChecklistStatus(text(formData, "status")),
    proof_url: text(formData, "proof_url") || null,
    remarks: text(formData, "remarks") || null,
    created_by: user.id
  });

  if (error) throw new Error(error.message);

  await notifyTaskAssignment({
    db: supabase,
    organizationId: organization.id,
    assignedTo: text(formData, "owner_name") || null,
    title,
    dueDate: dateValue(formData, "due_date"),
    assignedBy: await currentAdminName(supabase, user),
    kind: "checklist"
  });

  revalidatePath("/dashboard/checklists");
  revalidatePath("/dashboard", "layout");
}

function normalizeChecklistCsvRow(headers: string[], rawRow: string[]) {
  const row = headers.reduce<Record<string, string>>((data, header, index) => {
    const normalized = normalizeHeader(header);
    data[normalized] = rawRow[index] || "";
    return data;
  }, {});

  return {
    department_key: row.department_key || row.department || row.module || row.category,
    checklist_code: row.checklist_code || row.code || row.task_code || row.sr_no,
    title: row.title || row.task || row.checklist || row.activity || row.particulars || row.process,
    description: row.description || row.details || row.sop || row.instructions,
    owner_name: row.owner_name || row.owner || row.doer || row.responsible || row.department_owner,
    frequency: row.frequency || row.repeat || row.cadence,
    priority: row.priority || row.importance,
    due_date: row.due_date || row.deadline || row.target_date,
    status: row.status || row.stage,
    proof_url: row.proof_url || row.proof || row.link || row.evidence,
    remarks: row.remarks || row.remark || row.notes || row.comment
  };
}

export async function bulkImportDepartmentChecklists(formData: FormData) {
  const defaultDepartment = normalizeChecklistDepartment(text(formData, "department_key"));
  const organization = await ensureWorkspace(checklistPermissionModule(defaultDepartment), "edit");
  const { supabase, user } = await requireUser();
  const file = formData.get("checklist_csv");
  const pasted = text(formData, "checklist_csv_text");
  let csvText = pasted;

  if (file instanceof File && file.size > 0) {
    csvText = await file.text();
  }

  if (!csvText.trim()) {
    throw new Error("CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur checklist rows required hain.");
  }

  const payloads = rows
    .map((rawRow) => normalizeChecklistCsvRow(headers, rawRow))
    .filter((row) => row.title?.trim())
    .map((row) => {
      const departmentKey = row.department_key ? normalizeChecklistDepartment(row.department_key) : defaultDepartment;
      return {
        organization_id: organization.id,
        department_key: departmentKey,
        checklist_code: row.checklist_code?.trim() || null,
        title: row.title.trim(),
        description: row.description?.trim() || null,
        owner_name: row.owner_name?.trim() || null,
        frequency: normalizeChecklistFrequency(row.frequency),
        priority: normalizeChecklistPriority(row.priority),
        due_date: parseImportDate(row.due_date),
        status: normalizeChecklistStatus(row.status),
        proof_url: row.proof_url?.trim() || null,
        remarks: row.remarks?.trim() || null,
        created_by: user.id
      };
    });

  if (!payloads.length) {
    throw new Error("CSV me valid checklist rows nahi mile.");
  }

  const codedRows = payloads.filter((row) => row.checklist_code);
  const uncodedRows = payloads.filter((row) => !row.checklist_code);

  if (codedRows.length) {
    const { error } = await supabase
      .from("department_checklists")
      .upsert(codedRows, { onConflict: "organization_id,department_key,checklist_code" });
    if (error) throw new Error(error.message);
  }

  if (uncodedRows.length) {
    const { error } = await supabase.from("department_checklists").insert(uncodedRows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/checklists");
  revalidatePath("/dashboard", "layout");
}

export async function updateDepartmentChecklist(formData: FormData) {
  const departmentKey = normalizeChecklistDepartment(text(formData, "department_key"));
  const organization = await ensureWorkspace(checklistPermissionModule(departmentKey), "edit");
  const { supabase } = await requireUser();
  const checklistId = text(formData, "checklist_id");

  if (!checklistId) return;

  const { error } = await supabase
    .from("department_checklists")
    .update({
      status: normalizeChecklistStatus(text(formData, "status")),
      priority: normalizeChecklistPriority(text(formData, "priority")),
      due_date: dateValue(formData, "due_date"),
      proof_url: text(formData, "proof_url") || null,
      remarks: text(formData, "remarks") || null
    })
    .eq("organization_id", organization.id)
    .eq("department_key", departmentKey)
    .eq("id", checklistId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/checklists");
  revalidatePath("/dashboard", "layout");
}

// Display name of the current admin (used as "assigned by" on delegations).
async function currentAdminName(supabase: any, user: any) {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return data?.full_name || user.user_metadata?.full_name || user.email || "Admin";
}

// Next auto task code like TASK-0001, TASK-0002 ... per organization/table.
async function nextTaskCode(supabase: any, table: string, column: string, organizationId: string) {
  const { data } = await supabase.from(table).select(column).eq("organization_id", organizationId);
  let max = 0;
  for (const row of (data || []) as Array<Record<string, any>>) {
    const value = String(row[column] || "");
    const match = value.match(/^TASK-(\d+)$/i);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `TASK-${String(max + 1).padStart(4, "0")}`;
}

export async function addTaskDelegation(formData: FormData) {
  const departmentKey = normalizeChecklistDepartment(text(formData, "department_key"));
  const organization = await ensureWorkspace(checklistPermissionModule(departmentKey), "edit");
  const { supabase, user } = await requireUser();
  const title = text(formData, "title");

  if (!title) {
    throw new Error("Delegation task title required hai.");
  }

  const delegationCode =
    text(formData, "delegation_code") ||
    (await nextTaskCode(supabase, "task_delegations", "delegation_code", organization.id));
  const assignedBy = await currentAdminName(supabase, user);

  const { error } = await supabase.from("task_delegations").insert({
    organization_id: organization.id,
    department_key: departmentKey,
    delegation_code: delegationCode,
    title,
    description: text(formData, "description") || null,
    assigned_by: assignedBy,
    assigned_to: text(formData, "assigned_to") || null,
    priority: normalizeChecklistPriority(text(formData, "priority")),
    planned_date: dateValue(formData, "planned_date"),
    target_date: dateValue(formData, "target_date"),
    status: normalizeChecklistStatus(text(formData, "status")),
    proof_url: text(formData, "proof_url") || null,
    remarks: text(formData, "remarks") || null,
    created_by: user.id
  });

  if (error) throw new Error(error.message);

  await notifyTaskAssignment({
    db: supabase,
    organizationId: organization.id,
    assignedTo: text(formData, "assigned_to") || null,
    title,
    dueDate: dateValue(formData, "target_date"),
    assignedBy,
    kind: "delegation"
  });

  revalidatePath("/dashboard/delegation");
  revalidatePath("/dashboard/mis");
  revalidatePath("/dashboard", "layout");
}

function normalizeDelegationCsvRow(headers: string[], rawRow: string[]) {
  const row = headers.reduce<Record<string, string>>((data, header, index) => {
    data[normalizeHeader(header)] = rawRow[index] || "";
    return data;
  }, {});

  return {
    department_key: row.department_key || row.department || row.module || row.category,
    delegation_code: row.delegation_code || row.code || row.task_code || row.sr_no,
    title: row.title || row.task || row.delegation || row.activity || row.particulars,
    description: row.description || row.details || row.scope || row.instructions,
    assigned_to: row.assigned_to || row.doer || row.owner || row.responsible || row.assignee,
    assigned_by: row.assigned_by || row.manager || row.delegated_by,
    priority: row.priority || row.importance,
    planned_date: row.planned_date || row.plan_date || row.start_date,
    target_date: row.target_date || row.deadline || row.due_date,
    revised_date: row.revised_date || row.extended_date,
    completed_date: row.completed_date || row.done_date,
    status: row.status || row.stage,
    proof_url: row.proof_url || row.proof || row.link || row.evidence,
    remarks: row.remarks || row.remark || row.notes || row.comment
  };
}

export async function bulkImportTaskDelegations(formData: FormData) {
  const defaultDepartment = normalizeChecklistDepartment(text(formData, "department_key"));
  const organization = await ensureWorkspace(checklistPermissionModule(defaultDepartment), "edit");
  const { supabase, user } = await requireUser();
  const file = formData.get("delegation_csv");
  const pasted = text(formData, "delegation_csv_text");
  let csvText = pasted;

  if (file instanceof File && file.size > 0) {
    csvText = await file.text();
  }

  if (!csvText.trim()) {
    throw new Error("CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur delegation rows required hain.");
  }

  const payloads = rows
    .map((rawRow) => normalizeDelegationCsvRow(headers, rawRow))
    .filter((row) => row.title?.trim())
    .map((row) => {
      const departmentKey = row.department_key ? normalizeChecklistDepartment(row.department_key) : defaultDepartment;
      return {
        organization_id: organization.id,
        department_key: departmentKey,
        delegation_code: row.delegation_code?.trim() || null,
        title: row.title.trim(),
        description: row.description?.trim() || null,
        assigned_to: row.assigned_to?.trim() || null,
        assigned_by: row.assigned_by?.trim() || null,
        priority: normalizeChecklistPriority(row.priority),
        planned_date: parseImportDate(row.planned_date),
        target_date: parseImportDate(row.target_date),
        revised_date: parseImportDate(row.revised_date),
        completed_date: parseImportDate(row.completed_date),
        status: normalizeChecklistStatus(row.status),
        proof_url: row.proof_url?.trim() || null,
        remarks: row.remarks?.trim() || null,
        created_by: user.id
      };
    });

  if (!payloads.length) {
    throw new Error("CSV me valid delegation rows nahi mile.");
  }

  const codedRows = payloads.filter((row) => row.delegation_code);
  const uncodedRows = payloads.filter((row) => !row.delegation_code);

  if (codedRows.length) {
    const { error } = await supabase
      .from("task_delegations")
      .upsert(codedRows, { onConflict: "organization_id,delegation_code" });
    if (error) throw new Error(error.message);
  }

  if (uncodedRows.length) {
    const { error } = await supabase.from("task_delegations").insert(uncodedRows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/delegation");
  revalidatePath("/dashboard/mis");
  revalidatePath("/dashboard", "layout");
}

export async function updateTaskDelegation(formData: FormData) {
  const departmentKey = normalizeChecklistDepartment(text(formData, "department_key"));
  const organization = await ensureWorkspace(checklistPermissionModule(departmentKey), "edit");
  const { supabase } = await requireUser();
  const delegationId = text(formData, "delegation_id");

  if (!delegationId) return;

  const { error } = await supabase
    .from("task_delegations")
    .update({
      status: normalizeChecklistStatus(text(formData, "status")),
      priority: normalizeChecklistPriority(text(formData, "priority")),
      assigned_to: text(formData, "assigned_to") || null,
      target_date: dateValue(formData, "target_date"),
      revised_date: dateValue(formData, "revised_date"),
      completed_date: dateValue(formData, "completed_date"),
      proof_url: text(formData, "proof_url") || null,
      remarks: text(formData, "remarks") || null
    })
    .eq("organization_id", organization.id)
    .eq("id", delegationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/delegation");
  revalidatePath("/dashboard/mis");
  revalidatePath("/dashboard", "layout");
}

// --- Staff "My Tasks" dashboard --------------------------------------------
// These run for any logged-in organization member (even plain staff with no
// module permissions). They only touch the status/progress fields of a task
// that is already assigned to a person, so RLS member-update policies apply.
async function requireMembership() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data?.organization_id) {
    redirect("/dashboard/setup");
  }

  return { supabase, user, organizationId: data.organization_id as string };
}

export async function completeMyDelegation(formData: FormData) {
  const { supabase, organizationId } = await requireMembership();
  const delegationId = text(formData, "delegation_id");

  if (!delegationId) return;

  const status = normalizeChecklistStatus(text(formData, "status") || "done");
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("task_delegations")
    .update({
      status,
      completed_date: status === "done" ? today : null,
      proof_url: text(formData, "proof_url") || null,
      remarks: text(formData, "remarks") || null
    })
    .eq("organization_id", organizationId)
    .eq("id", delegationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/delegation");
  revalidatePath("/dashboard/mis");
}

export async function completeMyChecklist(formData: FormData) {
  const { supabase, organizationId } = await requireMembership();
  const checklistId = text(formData, "checklist_id");

  if (!checklistId) return;

  const status = normalizeChecklistStatus(text(formData, "status") || "done");

  const { error } = await supabase
    .from("department_checklists")
    .update({
      status,
      proof_url: text(formData, "proof_url") || null,
      remarks: text(formData, "remarks") || null
    })
    .eq("organization_id", organizationId)
    .eq("id", checklistId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/checklists");
  revalidatePath("/dashboard/mis");
}

export async function addSalesOrder(formData: FormData) {
  const organization = await ensureWorkspace("sales", "edit");
  const { supabase } = await requireUser();
  const total = numberValue(formData, "total");
  const taxable = Math.round((total / 1.18) * 100) / 100;
  const taxHalf = Math.round(((total - taxable) / 2) * 100) / 100;

  await supabase.from("sales_orders").insert({
    organization_id: organization.id,
    customer_id: text(formData, "customer_id"),
    order_number: text(formData, "order_number"),
    status: "sent",
    subtotal: taxable,
    cgst: taxHalf,
    sgst: taxHalf,
    igst: 0,
    total
  });
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
}

export async function addInvoice(formData: FormData) {
  const organization = await ensureWorkspace("invoices", "edit");
  const { supabase } = await requireUser();
  const total = numberValue(formData, "total");
  const taxable = Math.round((total / 1.18) * 100) / 100;
  const taxHalf = Math.round(((total - taxable) / 2) * 100) / 100;

  await supabase.from("invoices").insert({
    organization_id: organization.id,
    customer_id: text(formData, "customer_id"),
    invoice_number: text(formData, "invoice_number"),
    invoice_type: "sales",
    status: "sent",
    subtotal: taxable,
    cgst: taxHalf,
    sgst: taxHalf,
    igst: 0,
    total,
    balance_due: total
  });
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
}

export async function addEmployeeRecord(formData: FormData) {
  const organization = await ensureCanManageTeam();
  const { supabase, user } = await requireUser();
  const employeeCode = text(formData, "employee_code");
  const fullName = text(formData, "full_name");
  const loginEmail = text(formData, "login_email").toLowerCase();
  const authUserId = loginEmail ? await findAuthUserIdByEmail(loginEmail) : null;

  if (!employeeCode || !fullName) {
    throw new Error("Employee code aur full name required hai.");
  }

  const payload = {
    organization_id: organization.id,
    auth_user_id: authUserId,
    employee_code: employeeCode,
    full_name: fullName,
    login_email: loginEmail || null,
    personal_email: text(formData, "personal_email").toLowerCase() || null,
    phone: normalizePhoneValue(text(formData, "phone")),
    whatsapp: normalizePhoneValue(text(formData, "whatsapp")),
    department: text(formData, "department") || "General",
    designation: text(formData, "designation") || null,
    role: normalizeMemberRole(text(formData, "role")),
    reporting_manager: text(formData, "reporting_manager") || null,
    employment_type: normalizeEmploymentType(text(formData, "employment_type")),
    joining_date: dateValue(formData, "joining_date"),
    exit_date: dateValue(formData, "exit_date"),
    status: normalizeEmployeeStatus(text(formData, "status")),
    app_access_status: authUserId ? "active" : normalizeAppAccessStatus(text(formData, "app_access_status")),
    document_folder_url: text(formData, "document_folder_url") || null,
    emergency_contact_name: text(formData, "emergency_contact_name") || null,
    emergency_contact_phone: normalizePhoneValue(text(formData, "emergency_contact_phone")),
    address: text(formData, "address") || null,
    remarks: text(formData, "remarks") || null,
    created_by: user.id
  };

  const { error } = await supabase
    .from("employee_directory")
    .upsert(payload, { onConflict: "organization_id,employee_code" });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function bulkImportEmployees(formData: FormData) {
  const organization = await ensureCanManageTeam();
  const { supabase, user } = await requireUser();
  const csvFile = formData.get("employee_csv");
  const pastedCsv = text(formData, "employee_csv_text");
  const fileText =
    csvFile instanceof File && csvFile.size > 0 ? await csvFile.text() : "";
  const csvText = fileText || pastedCsv;

  if (!csvText.trim()) {
    throw new Error("Employee CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;
  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur employee rows required hain.");
  }

  const normalizedRows = rows
    .map((row) => normalizeEmployeeCsvRow(headers, row))
    .filter((row) => row.employee_code?.trim() && row.full_name?.trim());

  if (!normalizedRows.length) {
    throw new Error("CSV me employee_code aur full_name columns required hain.");
  }

  for (const row of normalizedRows) {
    const payload = employeePayloadFromCsvRow(organization.id, user.id, row);
    const authUserId = payload.login_email ? await findAuthUserIdByEmail(payload.login_email) : null;
    const { error } = await supabase.from("employee_directory").upsert(
      {
        ...payload,
        auth_user_id: authUserId,
        app_access_status: authUserId ? "active" : payload.app_access_status
      },
      { onConflict: "organization_id,employee_code" }
    );
    if (error) throw new Error(`Employee import failed: ${payload.employee_code}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function markAttendancePunch(formData: FormData) {
  const organization = await getCurrentOrganization();
  const { supabase, user } = await requireUser();

  if (!organization) {
    throw new Error("Organization access required.");
  }

  const punchType = text(formData, "punch_type") || "check_in";
  if (!["check_in", "check_out", "leave", "manual_note"].includes(punchType)) {
    throw new Error("Invalid attendance action.");
  }

  const selfie = formData.get("selfie");
  if (punchType !== "leave" && (!(selfie instanceof File) || selfie.size === 0)) {
    throw new Error("Attendance ke liye employee image/selfie required hai.");
  }

  if (selfie instanceof File && selfie.size > 6 * 1024 * 1024) {
    throw new Error("Image 6 MB se chhoti honi chahiye.");
  }

  if (selfie instanceof File && selfie.size > 0 && !selfie.type.startsWith("image/")) {
    throw new Error("Sirf image proof allowed hai.");
  }

  const employeeCodeInput = text(formData, "employee_code");
  const employeeNameInput = text(formData, "employee_name");
  const { data: employee } = await supabase
    .from("employee_directory")
    .select("id, employee_code, full_name")
    .eq("organization_id", organization.id)
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  const employeeName = employee?.full_name || employeeNameInput || user.email?.split("@")[0] || "Employee";
  const employeeCode = employee?.employee_code || employeeCodeInput || null;

  let selfiePath: string | null = null;
  if (selfie instanceof File && selfie.size > 0) {
    const extension = selfie.name.includes(".") ? selfie.name.split(".").pop() : "jpg";
    const path = `${organization.id}/${user.id}/${Date.now()}-${safeStorageName(employeeCode || employeeName)}.${extension}`;
    const admin = createAdminClient() as any;
    const { error: uploadError } = await admin.storage
      .from("attendance-selfies")
      .upload(path, selfie, {
        cacheControl: "3600",
        contentType: selfie.type || "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Attendance image upload failed: ${uploadError.message}`);
    }

    selfiePath = path;
  }

  const lat = numberValue(formData, "gps_lat", NaN);
  const lng = numberValue(formData, "gps_lng", NaN);
  const accuracy = numberValue(formData, "gps_accuracy", NaN);
  if (["check_in", "check_out"].includes(punchType) && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    throw new Error("Check in/out ke liye live GPS location capture required hai.");
  }

  const { error } = await supabase.from("attendance_punches").insert({
    organization_id: organization.id,
    employee_id: employee?.id || null,
    user_id: user.id,
    employee_code: employeeCode,
    employee_name: employeeName,
    punch_type: punchType,
    gps_lat: Number.isFinite(lat) ? lat : null,
    gps_lng: Number.isFinite(lng) ? lng : null,
    gps_accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
    location_note: text(formData, "location_note") || null,
    selfie_path: selfiePath,
    device_info: text(formData, "device_info") || null,
    remarks: text(formData, "remarks") || null
  });

  if (error) {
    throw new Error(`Attendance punch failed: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function createTeamLoginLink(formData: FormData) {
  await requireUser();
  const email = text(formData, "email");
  if (!email) {
    return;
  }
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://ram-setu-erp-ruddy.vercel.app"}/dashboard`
    }
  });
  revalidatePath("/dashboard/settings");
}

export async function createTeamMemberLogin(formData: FormData) {
  const organization = await ensureCanManageTeam();
  const email = text(formData, "email").toLowerCase();
  const fullName = text(formData, "full_name");
  const password = text(formData, "password");
  const phone = normalizePhoneValue(text(formData, "phone"));
  const department = text(formData, "department") || "General";
  const designation = text(formData, "designation") || null;
  const providedEmployeeCode = text(formData, "employee_code");
  const requestedRole = text(formData, "role") as AssignableMemberRole;
  const role: AssignableMemberRole = memberRoles.includes(requestedRole) ? requestedRole : "staff";

  if (!email.endsWith("@richagroup.co")) {
    throw new Error("Use a richagroup.co email address for team logins.");
  }

  if (password.length < 8) {
    throw new Error("Team password must be at least 8 characters.");
  }

  const admin = createAdminClient() as any;
  let userId = await findAuthUserIdByEmail(email);

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email.split("@")[0]
      }
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email.split("@")[0]
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    userId = data.user?.id || null;
  }

  if (!userId) {
    throw new Error("Could not create team login.");
  }

  await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName || email.split("@")[0]
  });

  await admin.from("organization_members").upsert({
    organization_id: organization.id,
    user_id: userId,
    role
  });

  await admin
    .from("organization_member_permissions")
    .delete()
    .eq("organization_id", organization.id)
    .eq("user_id", userId);

  const permissions = permissionModules.map((module) => {
    const canEdit = formData.get(`permission_${module.key}_edit`) === "on";
    const canView = canEdit || formData.get(`permission_${module.key}_view`) === "on";
    return {
      organization_id: organization.id,
      user_id: userId,
      module_key: module.key,
      can_view: canView,
      can_edit: canEdit
    };
  });

  await admin.from("organization_member_permissions").upsert(permissions);

  const employeeCode =
    providedEmployeeCode ||
    `EMP-${email
      .split("@")[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
  const employeePayload = {
    organization_id: organization.id,
    auth_user_id: userId,
    employee_code: employeeCode,
    full_name: fullName || email.split("@")[0],
    login_email: email,
    phone: phone || null,
    department,
    designation,
    role,
    status: "active",
    app_access_status: "active"
  };
  const { data: existingEmployee } = await admin
    .from("employee_directory")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("login_email", email)
    .limit(1)
    .maybeSingle();

  if (existingEmployee?.id) {
    await admin.from("employee_directory").update(employeePayload).eq("id", existingEmployee.id);
  } else {
    await admin.from("employee_directory").upsert(employeePayload, { onConflict: "organization_id,employee_code" });
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/users");
}

function normalizeTeamLoginCsvRow(headers: string[], rawRow: string[]) {
  const row = headers.reduce<Record<string, string>>((data, header, index) => {
    data[normalizeHeader(header)] = rawRow[index] || "";
    return data;
  }, {});

  return {
    employee_code: row.employee_code || row.code || row.emp_code,
    full_name: row.full_name || row.name || row.doer || row.employee_name,
    phone: row.phone || row.number || row.mobile || row.contact,
    email: row.email || row.login_email || row.work_email,
    department: row.department || row.dept,
    designation: row.designation || row.title || row.role_title,
    password: row.password || row.temp_password || row.temporary_password,
    role: row.role || row.access_role,
    permissions: row
  };
}

export async function bulkImportTeamLogins(formData: FormData) {
  const organization = await ensureCanManageTeam();
  const file = formData.get("user_csv");
  const pasted = text(formData, "user_csv_text");
  let csvText = pasted;

  if (file instanceof File && file.size > 0) {
    csvText = await file.text();
  }

  if (!csvText.trim()) {
    throw new Error("CSV file ya pasted CSV data required hai.");
  }

  const parsedRows = parseCsv(csvText);
  const [headers, ...rows] = parsedRows;

  if (!headers?.length || !rows.length) {
    throw new Error("CSV me header row aur user rows required hain.");
  }

  const admin = createAdminClient() as any;
  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    throw new Error(listError.message);
  }
  const userIdByEmail = new Map<string, string>(
    (existingUsers?.users || []).map((entry: any) => [String(entry.email || "").toLowerCase(), entry.id])
  );

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (const rawRow of rows) {
    const parsed = normalizeTeamLoginCsvRow(headers, rawRow);
    const email = (parsed.email || "").trim().toLowerCase();
    const fullName = (parsed.full_name || "").trim() || (email ? email.split("@")[0] : "");
    const password = (parsed.password || "").trim();
    const requestedRole = (parsed.role || "").trim().toLowerCase() as AssignableMemberRole;
    const role: AssignableMemberRole = memberRoles.includes(requestedRole) ? requestedRole : "staff";

    if (!email) continue;
    if (!email.endsWith("@richagroup.co")) {
      skipped.push(`${email} (richagroup.co email required)`);
      continue;
    }
    if (password.length < 8) {
      skipped.push(`${email} (password 8+ characters)`);
      continue;
    }

    let userId = userIdByEmail.get(email) || null;

    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      if (error) {
        skipped.push(`${email} (${error.message})`);
        continue;
      }
      updated += 1;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      if (error || !data.user?.id) {
        skipped.push(`${email} (${error?.message || "create failed"})`);
        continue;
      }
      const createdId = String(data.user.id);
      userId = createdId;
      userIdByEmail.set(email, createdId);
      created += 1;
    }

    await admin.from("profiles").upsert({ id: userId, full_name: fullName });
    await admin.from("organization_members").upsert({
      organization_id: organization.id,
      user_id: userId,
      role
    });

    await admin
      .from("organization_member_permissions")
      .delete()
      .eq("organization_id", organization.id)
      .eq("user_id", userId);

    const permissions = permissionModules
      .map((module) => {
        const cell = String(parsed.permissions[module.key] || "").trim().toLowerCase();
        const canEdit = ["edit", "write", "work", "yes", "y", "1", "true"].includes(cell);
        const canView = canEdit || ["view", "read", "yes", "y", "1", "true"].includes(cell);
        return {
          organization_id: organization.id,
          user_id: userId,
          module_key: module.key,
          can_view: canView,
          can_edit: canEdit
        };
      })
      .filter((permission) => permission.can_view || permission.can_edit);

    if (permissions.length) {
      await admin.from("organization_member_permissions").upsert(permissions);
    }

    const employeeCode =
      (parsed.employee_code || "").trim() ||
      `EMP-${email
        .split("@")[0]
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;
    const employeePayload = {
      organization_id: organization.id,
      auth_user_id: userId,
      employee_code: employeeCode,
      full_name: fullName,
      login_email: email,
      phone: normalizePhoneValue((parsed.phone || "").trim()) || null,
      department: (parsed.department || "").trim() || "General",
      designation: (parsed.designation || "").trim() || null,
      role,
      status: "active",
      app_access_status: "active"
    };
    const { data: existingEmployee } = await admin
      .from("employee_directory")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("login_email", email)
      .limit(1)
      .maybeSingle();

    if (existingEmployee?.id) {
      await admin.from("employee_directory").update(employeePayload).eq("id", existingEmployee.id);
    } else {
      await admin.from("employee_directory").upsert(employeePayload, { onConflict: "organization_id,employee_code" });
    }
  }

  if (created + updated === 0) {
    throw new Error(
      `Koi valid user nahi bana. ${skipped.length ? `Skipped: ${skipped.join("; ")}` : "CSV me email/password sahi se daalein."}`
    );
  }

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/settings");
}
