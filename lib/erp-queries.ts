import { redirect } from "next/navigation";
import { cache } from "react";
import type { PermissionAction, PermissionModuleKey } from "@/lib/access-control";
import { createClient } from "@/lib/supabase/server";

export type AppContext = {
  organization: {
    id: string;
    name: string;
  };
  role: string;
  isAdmin: boolean;
  permissions: Record<string, { canView: boolean; canEdit: boolean }>;
};

type AnyRecord = Record<string, any>;

export const getAppContext = cache(async function getAppContext(): Promise<AppContext> {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data } = await db
    .from("organization_members")
    .select("role, organizations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organization = data?.organizations;
  const resolved = Array.isArray(organization) ? organization[0] : organization;

  if (!resolved) {
    redirect("/dashboard/setup");
  }

  return {
    organization: {
      id: resolved.id,
      name: resolved.name
    },
    role: data.role,
    isAdmin: ["owner", "admin"].includes(data.role),
    permissions: await getPermissionsForUser(resolved.id, user.id)
  };
});

export const getRawAppContext = cache(async function getRawAppContext(): Promise<AppContext | null> {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data } = await db
    .from("organization_members")
    .select("role, organizations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organization = data?.organizations;
  const resolved = Array.isArray(organization) ? organization[0] : organization;

  return resolved
    ? {
      organization: {
        id: resolved.id,
        name: resolved.name
      },
      role: data.role,
      isAdmin: ["owner", "admin"].includes(data.role),
      permissions: await getPermissionsForUser(resolved.id, user.id)
    }
    : null;
});

const getPermissionsForUser = cache(async function getPermissionsForUser(organizationId: string, userId: string) {
  const supabase = await createClient();
  const db = supabase as any;
  const { data } = await db
    .from("organization_member_permissions")
    .select("module_key, can_view, can_edit")
    .eq("organization_id", organizationId)
    .eq("user_id", userId);

  return ((data || []) as AnyRecord[]).reduce<Record<string, { canView: boolean; canEdit: boolean }>>(
    (permissions, row) => {
      permissions[row.module_key] = {
        canView: Boolean(row.can_view),
        canEdit: Boolean(row.can_edit)
      };
      return permissions;
    },
    {}
  );
});

export function canAccessModule(
  context: Pick<AppContext, "isAdmin" | "permissions">,
  moduleKey: PermissionModuleKey,
  action: PermissionAction = "view"
) {
  if (context.isAdmin) {
    return true;
  }

  const permission = context.permissions[moduleKey];
  return action === "edit" ? Boolean(permission?.canEdit) : Boolean(permission?.canView);
}

export async function requireModuleAccess(
  moduleKey: PermissionModuleKey,
  action: PermissionAction = "view"
) {
  const context = await getAppContext();

  if (!canAccessModule(context, moduleKey, action)) {
    redirect("/dashboard");
  }

  return context;
}

export async function getDashboardData() {
  const context = await getAppContext();
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;

  const [customers, vendors, products, movements, salesOrders, invoices] = await Promise.all([
    canAccessModule(context, "customers")
      ? db.from("customers").select("*").eq("organization_id", organization.id).order("created_at")
      : Promise.resolve({ data: [] }),
    canAccessModule(context, "vendors")
      ? db.from("vendors").select("*").eq("organization_id", organization.id).order("created_at")
      : Promise.resolve({ data: [] }),
    canAccessModule(context, "products")
      ? db.from("products").select("*").eq("organization_id", organization.id).order("created_at")
      : Promise.resolve({ data: [] }),
    canAccessModule(context, "inventory")
      ? db
          .from("inventory_movements")
          .select("*, products(name, sku)")
          .eq("organization_id", organization.id)
          .order("moved_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canAccessModule(context, "sales")
      ? db
          .from("sales_orders")
          .select("*, customers(name, phone, whatsapp, email), sales_order_items(quantity, unit_price, line_total, products(sku, name, unit))")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canAccessModule(context, "invoices")
      ? db
          .from("invoices")
          .select("*, customers(name), vendors(name)")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] })
  ]);

  const orderRows = (salesOrders.data || []) as AnyRecord[];
  const invoiceRows = (invoices.data || []) as AnyRecord[];
  const movementRows = (movements.data || []) as AnyRecord[];
  const productRows = (products.data || []) as AnyRecord[];
  const customerRows = (customers.data || []) as AnyRecord[];
  const vendorRows = (vendors.data || []) as AnyRecord[];
  const orderBook = orderRows.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const receivable = invoiceRows.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
  const inventoryUnits =
    movementRows.reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);

  return {
    organization,
    access: context,
    customers: customerRows,
    vendors: vendorRows,
    products: productRows,
    movements: movementRows,
    salesOrders: orderRows,
    invoices: invoiceRows,
    kpis: [
      { label: "Order book", value: orderBook, note: `${orderRows.length} active orders` },
      { label: "Receivables", value: receivable, note: `${invoiceRows.length} invoices` },
      { label: "Inventory units", value: inventoryUnits, note: `${productRows.length} SKUs` },
      { label: "Buyer accounts", value: customerRows.length, note: "Active buyer master" }
    ]
  };
}

export async function getModuleData() {
  const context = await getAppContext();
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;
  const canUseCustomers =
    canAccessModule(context, "customers") || canAccessModule(context, "sales") || canAccessModule(context, "invoices");
  const canUseVendors =
    canAccessModule(context, "vendors") || canAccessModule(context, "purchases") || canAccessModule(context, "invoices");
  const canUseProducts =
    canAccessModule(context, "products") ||
    canAccessModule(context, "inventory") ||
    canAccessModule(context, "sales") ||
    canAccessModule(context, "purchases");

  const [customers, vendors, products, warehouses, movements, salesOrders, purchaseOrders, invoices, members, checklists] =
    await Promise.all([
      canUseCustomers
        ? db.from("customers").select("*").eq("organization_id", organization.id).order("created_at")
        : Promise.resolve({ data: [] }),
      canUseVendors
        ? db.from("vendors").select("*").eq("organization_id", organization.id).order("created_at")
        : Promise.resolve({ data: [] }),
      canUseProducts
        ? db.from("products").select("*").eq("organization_id", organization.id).order("created_at")
        : Promise.resolve({ data: [] }),
      canAccessModule(context, "inventory")
        ? db.from("warehouses").select("*").eq("organization_id", organization.id).order("created_at")
        : Promise.resolve({ data: [] }),
      canAccessModule(context, "inventory")
        ? db
            .from("inventory_movements")
            .select("*, products(name, sku), warehouses(name)")
            .eq("organization_id", organization.id)
            .order("moved_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      canAccessModule(context, "sales")
        ? db
            .from("sales_orders")
            .select("*, customers(name, phone, whatsapp, email), sales_order_items(quantity, unit_price, line_total, products(sku, name, unit))")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      canAccessModule(context, "purchases")
        ? db
            .from("purchase_orders")
            .select("*, vendors(name, phone, email), purchase_order_items(quantity, unit_price, line_total, products(sku, name, unit))")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      canAccessModule(context, "invoices")
        ? db
            .from("invoices")
            .select("*, customers(name), vendors(name)")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      context.isAdmin
        ? db
            .from("organization_members")
            .select("user_id, role, created_at, profiles(full_name), organization_member_permissions(module_key, can_view, can_edit)")
            .eq("organization_id", organization.id)
        : Promise.resolve({ data: [] }),
      canAccessModule(context, "reports")
        ? db
            .from("department_checklists")
            .select("*")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] })
    ]);

  return {
    organization,
    access: context,
    customers: (customers.data || []) as AnyRecord[],
    vendors: (vendors.data || []) as AnyRecord[],
    products: (products.data || []) as AnyRecord[],
    warehouses: (warehouses.data || []) as AnyRecord[],
    movements: (movements.data || []) as AnyRecord[],
    salesOrders: (salesOrders.data || []) as AnyRecord[],
    purchaseOrders: (purchaseOrders.data || []) as AnyRecord[],
    invoices: (invoices.data || []) as AnyRecord[],
    checklists: (checklists.data || []) as AnyRecord[],
    members: (members.data || []) as AnyRecord[]
  };
}

export type EmployeeOption = { name: string; email: string | null; code: string | null };

async function getEmployeeOptions(db: any, organizationId: string): Promise<EmployeeOption[]> {
  const { data } = await db
    .from("employee_directory")
    .select("full_name, login_email, employee_code")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  return ((data || []) as AnyRecord[])
    .filter((row) => row.full_name)
    .map((row) => ({
      name: String(row.full_name),
      email: row.login_email || null,
      code: row.employee_code || null
    }));
}

export async function getChecklistData(departmentKey?: string) {
  const context = await getAppContext();
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;
  let query = db.from("department_checklists").select("*").eq("organization_id", organization.id);

  if (departmentKey) {
    query = query.eq("department_key", departmentKey);
  }

  const [{ data }, employees] = await Promise.all([
    query.order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    getEmployeeOptions(db, organization.id)
  ]);

  return {
    organization,
    access: context,
    checklists: (data || []) as AnyRecord[],
    employees
  };
}

export type MemberRow = {
  userId: string;
  role: string;
  displayName: string;
  email: string | null;
  employeeCode: string | null;
  createdAt: string | null;
  permissions: Record<string, { canView: boolean; canEdit: boolean }>;
};

export async function getUsersPageData() {
  const context = await getAppContext();
  if (!context.isAdmin) {
    redirect("/dashboard");
  }
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;

  const [membersResult, employeesResult] = await Promise.all([
    db
      .from("organization_members")
      .select("user_id, role, created_at, profiles(full_name), organization_member_permissions(module_key, can_view, can_edit)")
      .eq("organization_id", organization.id),
    db
      .from("employee_directory")
      .select("auth_user_id, full_name, login_email, employee_code")
      .eq("organization_id", organization.id)
  ]);

  const employees: AnyRecord[] = employeesResult.data || [];
  const rawMembers: AnyRecord[] = membersResult.data || [];

  const members: MemberRow[] = rawMembers.map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    const employee = employees.find((e) => e.auth_user_id === member.user_id);
    const permissions = ((member.organization_member_permissions || []) as AnyRecord[]).reduce<
      Record<string, { canView: boolean; canEdit: boolean }>
    >((acc, perm) => {
      acc[perm.module_key] = { canView: Boolean(perm.can_view), canEdit: Boolean(perm.can_edit) };
      return acc;
    }, {});
    return {
      userId: member.user_id,
      role: member.role,
      displayName: profile?.full_name || employee?.full_name || "Team member",
      email: employee?.login_email || null,
      employeeCode: employee?.employee_code || null,
      createdAt: member.created_at || null,
      permissions
    };
  });

  return { organization, access: context, members };
}

export async function getDelegationData(departmentKey?: string) {
  const context = await getAppContext();
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;
  let query = db.from("task_delegations").select("*").eq("organization_id", organization.id);

  if (departmentKey) {
    query = query.eq("department_key", departmentKey);
  }

  const [{ data }, employees] = await Promise.all([
    query.order("target_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    getEmployeeOptions(db, organization.id)
  ]);

  return {
    organization,
    access: context,
    delegations: (data || []) as AnyRecord[],
    employees
  };
}

export type MyTaskIdentity = {
  userId: string;
  email: string | null;
  fullName: string | null;
  employeeCode: string | null;
};

function normalizeIdentityValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

// A delegation/checklist is "mine" when its free-text owner field matches any
// of my identities (full name, login email or employee code), case-insensitive.
function isAssignedToMe(assignee: unknown, identities: Set<string>) {
  const normalized = normalizeIdentityValue(assignee);
  if (!normalized) return false;
  return identities.has(normalized);
}

export async function getMyTaskData() {
  const context = await getAppContext();
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const [{ data: profileRow }, { data: employee }, { data: delegationRows }, { data: checklistRows }] =
    await Promise.all([
      db.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      db
        .from("employee_directory")
        .select(
          "full_name, login_email, employee_code, department, designation, phone, whatsapp, role, reporting_manager, joining_date, employment_type, status"
        )
        .eq("organization_id", organization.id)
        .eq("auth_user_id", user.id)
        .maybeSingle(),
      db
        .from("task_delegations")
        .select("*")
        .eq("organization_id", organization.id)
        .order("target_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      db
        .from("department_checklists")
        .select("*")
        .eq("organization_id", organization.id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
    ]);

  const fullName = (employee?.full_name || profileRow?.full_name || user.user_metadata?.full_name || null) as
    | string
    | null;
  const identity: MyTaskIdentity = {
    userId: user.id,
    email: user.email || employee?.login_email || null,
    fullName,
    employeeCode: employee?.employee_code || null
  };

  const identities = new Set(
    [user.email, employee?.login_email, fullName, profileRow?.full_name, user.user_metadata?.full_name, employee?.employee_code]
      .map(normalizeIdentityValue)
      .filter(Boolean)
  );

  const myDelegations = ((delegationRows || []) as AnyRecord[]).filter((row) =>
    isAssignedToMe(row.assigned_to, identities)
  );
  const myChecklists = ((checklistRows || []) as AnyRecord[]).filter((row) =>
    isAssignedToMe(row.owner_name, identities)
  );

  const profile = {
    fullName,
    email: identity.email,
    employeeCode: employee?.employee_code || null,
    role: (employee?.role || context.role || null) as string | null,
    department: employee?.department || null,
    designation: employee?.designation || null,
    phone: employee?.phone || null,
    whatsapp: employee?.whatsapp || null,
    reportingManager: employee?.reporting_manager || null,
    joiningDate: employee?.joining_date || null,
    employmentType: employee?.employment_type || null,
    status: employee?.status || null,
    organizationName: organization.name
  };

  return {
    organization,
    access: context,
    identity,
    profile,
    delegations: myDelegations,
    checklists: myChecklists
  };
}

export async function getMisReportData() {
  const context = await getAppContext();
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;

  const [{ data: checklistData }, { data: delegationData }] = await Promise.all([
    db.from("department_checklists").select("*").eq("organization_id", organization.id),
    db.from("task_delegations").select("*").eq("organization_id", organization.id)
  ]);

  const checklists = (checklistData || []) as AnyRecord[];
  const delegations = (delegationData || []) as AnyRecord[];

  // Tag each row so we can build a single combined MIS dataset.
  const combined: AnyRecord[] = [
    ...checklists.map((row) => ({
      type: "checklist",
      department_key: row.department_key,
      owner: row.owner_name,
      status: row.status,
      due_date: row.due_date,
      title: row.title
    })),
    ...delegations.map((row) => ({
      type: "delegation",
      department_key: row.department_key,
      owner: row.assigned_to,
      status: row.status,
      due_date: row.revised_date || row.target_date,
      title: row.title
    }))
  ];

  return {
    organization,
    access: context,
    combined,
    checklistCount: checklists.length,
    delegationCount: delegations.length
  };
}

export async function getEmployeeDirectoryData(filters: { department?: string; status?: string; access?: string; q?: string } = {}) {
  const context = await getAppContext();
  const { organization } = context;
  const supabase = await createClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("employee_directory")
    .select("*")
    .eq("organization_id", organization.id)
    .order("department", { ascending: true })
    .order("full_name", { ascending: true });

  const allEmployees = error ? [] : ((data || []) as AnyRecord[]);
  const department = filters.department?.trim() || "";
  const status = filters.status?.trim() || "";
  const access = filters.access?.trim() || "";
  const q = filters.q?.trim().toLowerCase() || "";

  const employees = allEmployees.filter((employee) => {
    const departmentMatch = !department || employee.department === department;
    const statusMatch = !status || employee.status === status;
    const accessMatch = !access || employee.app_access_status === access;
    const searchText = [
      employee.employee_code,
      employee.full_name,
      employee.department,
      employee.designation,
      employee.login_email,
      employee.phone,
      employee.whatsapp,
      employee.reporting_manager
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchMatch = !q || searchText.includes(q);
    return departmentMatch && statusMatch && accessMatch && searchMatch;
  });

  return {
    organization,
    access: context,
    employees,
    allEmployees,
    filters: { department, status, access, q },
    error: error?.message || null
  };
}
